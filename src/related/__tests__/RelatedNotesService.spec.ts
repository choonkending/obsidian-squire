/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import { termFrequencies } from "../text";
import type { NoteDoc } from "../types";
import type { RelatedWeights } from "../types";
import type { SquireSettings } from "../../types";
import { RelatedNotesService, combineScores } from "../RelatedNotesService";

const fakeBuildNoteDoc = jest.fn();
const fakeCollectCandidates = jest.fn();

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

describe("RelatedNotesService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

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

        fakeBuildNoteDoc.mockResolvedValue(target);
        fakeCollectCandidates.mockResolvedValue([target, c1, c2]);

        const service = new RelatedNotesService(
            {} as any,
            () => makeSettings({ relatedNotesLimit: 1 }),
            fakeBuildNoteDoc,
            fakeCollectCandidates,
        );
        const results = await service.findRelated({} as any);

        expect(results).toHaveLength(1);
    });

    it("excludes the target note from results", async () => {
        const target = makeDoc("target.md", {
            tokens: termFrequencies(["alpha"]),
        });
        const other = makeDoc("other.md", {
            tokens: termFrequencies(["alpha"]),
        });

        fakeBuildNoteDoc.mockResolvedValue(target);
        fakeCollectCandidates.mockResolvedValue([other]);

        const service = new RelatedNotesService(
            {} as any,
            () => makeSettings(),
            fakeBuildNoteDoc,
            fakeCollectCandidates,
        );
        const results = await service.findRelated({} as any);

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

        fakeBuildNoteDoc.mockResolvedValue(target);
        fakeCollectCandidates.mockResolvedValue([target, tagMatch, wordMatch]);

        const service = new RelatedNotesService(
            {} as any,
            () =>
                makeSettings({
                    weightWords: 0.1,
                    weightTags: 1,
                    weightLinks: 0,
                }),
            fakeBuildNoteDoc,
            fakeCollectCandidates,
        );
        const results = await service.findRelated({} as any);

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

        fakeBuildNoteDoc.mockResolvedValue(target);
        fakeCollectCandidates.mockResolvedValue([target, tagMatch, wordMatch]);

        const service = new RelatedNotesService(
            {} as any,
            () =>
                makeSettings({
                    weightWords: 1,
                    weightTags: 0,
                    weightLinks: 0,
                }),
            fakeBuildNoteDoc,
            fakeCollectCandidates,
        );
        const results = await service.findRelated({} as any);

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
    class FakeSemanticService {
        private scores: Map<string, number>;

        constructor(scores: Record<string, number>) {
            this.scores = new Map(Object.entries(scores));
        }

        async ensureIndexed(): Promise<void> {}
        async score(_text: string): Promise<Map<string, number> | null> {
            return this.scores;
        }
    }

    const fakeBuildNoteDoc2 = jest.fn();
    const fakeCollectCandidates2 = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

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

        fakeBuildNoteDoc2.mockResolvedValue(target);
        fakeCollectCandidates2.mockResolvedValue([target, candidateA, candidateB]);

        const semantic = new FakeSemanticService({ "a.md": 0.9, "b.md": 0.1 });

        const service = new RelatedNotesService(
            { vault: { cachedRead: async () => "query text" } } as any,
            () =>
                makeSettings({
                    weightWords: 1,
                    weightTags: 0,
                    weightLinks: 0,
        semanticModelId: '',
                }),
            fakeBuildNoteDoc2,
            fakeCollectCandidates2,
            semantic as any
        );

        const results = await service.findRelated({} as any);

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

        fakeBuildNoteDoc2.mockResolvedValue(target);
        fakeCollectCandidates2.mockResolvedValue([target, wordMatch, tagMatch]);

        const semantic = new FakeSemanticService({ "word.md": 0.1, "tag.md": 0.9 });

        const service = new RelatedNotesService(
            { vault: { cachedRead: async () => "query" } } as any,
            () =>
                makeSettings({
                    weightWords: 1,
                    weightTags: 0.5,
                    weightLinks: 0,
                    semanticModelId: '',
                }),
            fakeBuildNoteDoc2,
            fakeCollectCandidates2,
            semantic as any
        );

        const results = await service.findRelated({} as any);

        expect(results[0].path).toBe("word.md");
    });
});
