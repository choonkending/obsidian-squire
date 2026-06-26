import LexicalEngine, { DEFAULT_WEIGHTS } from "../LexicalEngine";
import { termFrequencies } from "../text";
import type { NoteDoc } from "../types";

function makeDoc(
    path: string,
    overrides: Partial<Omit<NoteDoc, "path">> = {}
): NoteDoc {
    return {
        path,
        title: overrides.title ?? path,
        tokens: overrides.tokens ?? new Map<string, number>(),
        tags: overrides.tags ?? new Set<string>(),
        links: overrides.links ?? new Set<string>(),
    };
}

describe("LexicalEngine", () => {
    describe("rank", () => {
        it("excludes the target note itself", () => {
            const engine = new LexicalEngine();
            const target = makeDoc("a.md", {
                tokens: termFrequencies(["machine", "learning"]),
            });
            const candidates = [
                target,
                makeDoc("b.md", { tokens: termFrequencies(["machine", "learning"]) }),
            ];

            const results = engine.rank(target, candidates, 5);

            expect(results.map(r => r.path)).toEqual(["b.md"]);
        });

        it("ranks notes with higher word overlap first", () => {
            const engine = new LexicalEngine();
            const target = makeDoc("target.md", {
                tokens: termFrequencies(["neural", "networks", "deep", "learning"]),
            });
            const candidates = [
                makeDoc("low.md", { tokens: termFrequencies(["cooking", "recipes"]) }),
                makeDoc("high.md", {
                    tokens: termFrequencies(["neural", "networks", "deep"]),
                }),
                makeDoc("medium.md", { tokens: termFrequencies(["deep", "ocean"]) }),
            ];

            const results = engine.rank(target, candidates, 5, { words: 1, tags: 0, links: 0 });

            expect(results.map(r => r.path)).toEqual(["high.md", "medium.md"]);
        });

        it("matches purely on tags when tag weight is used", () => {
            const engine = new LexicalEngine();
            const target = makeDoc("target.md", { tags: new Set(["ml", "ai"]) });
            const candidates = [
                makeDoc("shared.md", { tags: new Set(["ml", "ai"]) }),
                makeDoc("unrelated.md", { tags: new Set(["cooking"]) }),
            ];

            const results = engine.rank(target, candidates, 5, { words: 0, tags: 1, links: 0 });

            expect(results.map(r => r.path)).toEqual(["shared.md"]);
        });

        it("matches purely on links when link weight is used", () => {
            const engine = new LexicalEngine();
            const target = makeDoc("target.md", { links: new Set(["index", "moc"]) });
            const candidates = [
                makeDoc("shared.md", { links: new Set(["index"]) }),
                makeDoc("unrelated.md", { links: new Set(["other"]) }),
            ];

            const results = engine.rank(target, candidates, 5, { words: 0, tags: 0, links: 1 });

            expect(results.map(r => r.path)).toEqual(["shared.md"]);
        });

        it("respects the limit", () => {
            const engine = new LexicalEngine();
            const target = makeDoc("target.md", {
                tokens: termFrequencies(["alpha", "beta", "gamma"]),
            });
            const candidates = [
                makeDoc("c1.md", { tokens: termFrequencies(["alpha"]) }),
                makeDoc("c2.md", { tokens: termFrequencies(["beta"]) }),
                makeDoc("c3.md", { tokens: termFrequencies(["gamma"]) }),
            ];

            const results = engine.rank(target, candidates, 2, { words: 1, tags: 0, links: 0 });

            expect(results).toHaveLength(2);
        });

        it("returns an empty array when limit is zero or negative", () => {
            const engine = new LexicalEngine();
            const target = makeDoc("target.md", {
                tokens: termFrequencies(["alpha"]),
            });
            const candidates = [
                makeDoc("c1.md", { tokens: termFrequencies(["alpha"]) }),
            ];

            expect(engine.rank(target, candidates, 0)).toEqual([]);
            expect(engine.rank(target, candidates, -1)).toEqual([]);
        });

        it("excludes candidates with zero score", () => {
            const engine = new LexicalEngine();
            const target = makeDoc("target.md", {
                tokens: termFrequencies(["alpha"]),
            });
            const candidates = [
                makeDoc("nomatch.md", { tokens: termFrequencies(["zeta"]) }),
            ];

            expect(engine.rank(target, candidates, 5, { words: 1, tags: 0, links: 0 })).toEqual([]);
        });

        it("breaks ties deterministically by title then path", () => {
            const engine = new LexicalEngine();
            const target = makeDoc("target.md", {
                tokens: termFrequencies(["alpha"]),
            });
            const candidates = [
                makeDoc("z.md", { title: "Zebra", tokens: termFrequencies(["alpha"]) }),
                makeDoc("a.md", { title: "Apple", tokens: termFrequencies(["alpha"]) }),
            ];

            const results = engine.rank(target, candidates, 5, { words: 1, tags: 0, links: 0 });

            expect(results.map(r => r.title)).toEqual(["Apple", "Zebra"]);
        });

        it("combines signals via weighted sum", () => {
            const engine = new LexicalEngine();
            const target = makeDoc("target.md", {
                tokens: termFrequencies(["graph", "theory"]),
                tags: new Set(["math"]),
                links: new Set(["index"]),
            });
            const both = makeDoc("both.md", {
                tokens: termFrequencies(["graph", "theory"]),
                tags: new Set(["math"]),
                links: new Set(["index"]),
            });
            const wordsOnly = makeDoc("words.md", {
                tokens: termFrequencies(["graph", "theory"]),
            });

            const results = engine.rank(target, [wordsOnly, both], 5);

            expect(results[0].path).toBe("both.md");
            expect(results[0].score).toBeGreaterThan(results[1].score);
        });
    });

    describe("score", () => {
        it("returns 0 when all weights are zero", () => {
            const engine = new LexicalEngine();
            const a = makeDoc("a.md", { tokens: termFrequencies(["x"]) });
            const b = makeDoc("b.md", { tokens: termFrequencies(["x"]) });
            expect(engine.score(a, b, { words: 0, tags: 0, links: 0 })).toBe(0);
        });

        it("returns a normalized score in [0, 1]", () => {
            const engine = new LexicalEngine();
            const a = makeDoc("a.md", {
                tokens: termFrequencies(["x", "y"]),
                tags: new Set(["t"]),
                links: new Set(["l"]),
            });
            const b = makeDoc("b.md", {
                tokens: termFrequencies(["x", "y"]),
                tags: new Set(["t"]),
                links: new Set(["l"]),
            });
            const score = engine.score(a, b);
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(1);
        });
    });
});
