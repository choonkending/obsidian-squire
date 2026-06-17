/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import { termFrequencies } from "../text";
import type { NoteDoc } from "../types";
import type { SquireSettings } from "../../types";
import { RelatedNotesService } from "../RelatedNotesService";

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
