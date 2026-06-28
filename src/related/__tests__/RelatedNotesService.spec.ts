import { termFrequencies } from "../text";
import type { NoteDoc } from "../types";
import type { SquireSettings } from "../../types";
import { RelatedNotesService, combineScores } from "../RelatedNotesService";
import type { SemanticService } from "../semantic";
import type { App, TFile } from "obsidian";

function makeDoc(
    path: string,
    overrides: Partial<Omit<NoteDoc, "path">> = {}
): NoteDoc {
    return {
        path,
        title: overrides.title ?? path.replace(/\.md$/, ""),
        tokens: overrides.tokens ?? new Map<string, number>(),
        tags: overrides.tags ?? new Set<string>(),
        links: overrides.links ?? new Set<string>(),
    };
}

function makeSettings(
    overrides: Partial<SquireSettings> = {}
): SquireSettings {
    return {
        indexSeparator: "",
        relatedNotesLimit: 5,
        weightWords: 1,
        weightTags: 0.5,
        weightLinks: 0.5,
        showRelatedNotesSidebar: true,
        semanticModelId: '',
        ...overrides,
    };
}

function makeApp(): App {
    return { vault: { cachedRead: async () => "" } } as unknown as App;
}

function makeFile(): TFile {
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
    return { path: "test.md" } as unknown as TFile;
}

describe("RelatedNotesService", () => {
    it("respects relatedNotesLimit from settings", async () => {
        const target = makeDoc("target.md", {
            tokens: termFrequencies(["alpha", "beta"]),
        });
        const c1 = makeDoc("c1.md", {
            tokens: termFrequencies(["alpha"]),
        });
        const c2 = makeDoc("c2.md", {
            tokens: termFrequencies(["beta"]),
        });

        const service = new RelatedNotesService(
            makeApp(),
            () => makeSettings({ relatedNotesLimit: 1 }),
            () => Promise.resolve(target),
            () => Promise.resolve([target, c1, c2]),
        );
        const results = await service.findRelated(makeFile());

        expect(results).toHaveLength(1);
    });

    it("excludes the target note from results", async () => {
        const target = makeDoc("target.md", {
            tokens: termFrequencies(["alpha"]),
        });
        const other = makeDoc("other.md", {
            tokens: termFrequencies(["alpha"]),
        });

        const service = new RelatedNotesService(
            makeApp(),
            () => makeSettings(),
            () => Promise.resolve(target),
            () => Promise.resolve([other]),
        );
        const results = await service.findRelated(makeFile());

        expect(results.map(r => r.path)).not.toContain("target.md");
        expect(results.map(r => r.path)).toContain("other.md");
    });

    it("ranks tag-heavy matches first when tag weight is high", async () => {
        const target = makeDoc("target.md", {
            tokens: termFrequencies(["alpha"]),
            tags: new Set(["ml"]),
        });
        const tagMatch = makeDoc("tag-match.md", {
            tokens: termFrequencies(["zzz"]),
            tags: new Set(["ml"]),
        });
        const wordMatch = makeDoc("word-match.md", {
            tokens: termFrequencies(["alpha"]),
        });

        const service = new RelatedNotesService(
            makeApp(),
            () =>
                makeSettings({
                    weightWords: 0.1,
                    weightTags: 1,
                    weightLinks: 0,
                }),
            () => Promise.resolve(target),
            () => Promise.resolve([target, tagMatch, wordMatch]),
        );
        const results = await service.findRelated(makeFile());

        expect(results[0].path).toBe("tag-match.md");
    });

    it("ranks word-heavy matches first when word weight is high", async () => {
        const target = makeDoc("target.md", {
            tokens: termFrequencies(["alpha", "beta"]),
            tags: new Set(["ml"]),
        });
        const tagMatch = makeDoc("tag-match.md", {
            tags: new Set(["ml"]),
        });
        const wordMatch = makeDoc("word-match.md", {
            tokens: termFrequencies(["alpha", "beta"]),
        });

        const service = new RelatedNotesService(
            makeApp(),
            () =>
                makeSettings({
                    weightWords: 1,
                    weightTags: 0,
                    weightLinks: 0,
                }),
            () => Promise.resolve(target),
            () => Promise.resolve([target, tagMatch, wordMatch]),
        );
        const results = await service.findRelated(makeFile());

        expect(results[0].path).toBe("word-match.md");
    });
});

describe("combineScores", () => {
    it("returns lexical score when semantic is undefined", () => {
        expect(combineScores(0.8, undefined)).toBeCloseTo(0.8, 6);
    });

    it("averages lexical and semantic scores", () => {
        const result = combineScores(0.6, 0.8);
        expect(result).toBeCloseTo(0.7, 6);
    });

    it("returns 0 when lexical is 0 and semantic is 0", () => {
        expect(combineScores(0, 0)).toBe(0);
    });
});

describe("RelatedNotesService with SemanticService", () => {
    class FakeSemanticService implements SemanticService {
        private scores: Map<string, number>;

        constructor(scores: Record<string, number>) {
            this.scores = new Map(Object.entries(scores));
        }

        async init(_modelId: string): Promise<void> {}
        async score(_text: string): Promise<Map<string, number> | null> {
            return this.scores;
        }
    }

    it("semantic score influences ranking when model is set", async () => {
        const target = makeDoc("target.md", {
            tokens: termFrequencies(["alpha", "beta"]),
        });
        const candidateA = makeDoc("a.md", {
            tokens: termFrequencies(["alpha", "beta"]),
        });
        const candidateB = makeDoc("b.md", {
            tokens: termFrequencies(["alpha", "beta"]),
        });

        const semantic = new FakeSemanticService({ "a.md": 0.9, "b.md": 0.1 });

        const service = new RelatedNotesService(
            makeApp(),
            () =>
                makeSettings({
                    weightWords: 1,
                    weightTags: 0,
                    weightLinks: 0,
                    semanticModelId: 'Xenova/gte-small',
                }),
            () => Promise.resolve(target),
            () => Promise.resolve([target, candidateA, candidateB]),
            semantic
        );

        const results = await service.findRelated(makeFile());

        expect(results[0].path).toBe("a.md");
        expect(results[1].path).toBe("b.md");
    });

    it("ranking favors lexical when model is not set", async () => {
        const target = makeDoc("target.md", {
            tokens: termFrequencies(["alpha"]),
            tags: new Set(["ml"]),
        });
        const wordMatch = makeDoc("word.md", {
            tokens: termFrequencies(["alpha"]),
        });
        const tagMatch = makeDoc("tag.md", {
            tags: new Set(["ml"]),
        });

        const semantic = new FakeSemanticService({ "word.md": 0.1, "tag.md": 0.9 });

        const service = new RelatedNotesService(
            makeApp(),
            () =>
                makeSettings({
                    weightWords: 1,
                    weightTags: 0.5,
                    weightLinks: 0,
                    semanticModelId: '',
                }),
            () => Promise.resolve(target),
            () => Promise.resolve([target, wordMatch, tagMatch]),
            semantic
        );

        const results = await service.findRelated(makeFile());

        expect(results[0].path).toBe("word.md");
    });
});
