import { EmbeddingIndex } from "../EmbeddingIndex";
import { cosineSimilarityDense } from "../../text";
import type { DataAdapter } from "../EmbeddingIndex";

class InMemoryAdapter implements DataAdapter {
    private store = new Map<string, string>();

    async read(path: string): Promise<string> {
        const val = this.store.get(path);
        if (val === undefined) throw new Error("not found");
        return val;
    }

    async write(path: string, data: string): Promise<void> {
        this.store.set(path, data);
    }

    get raw(): ReadonlyMap<string, string> {
        return this.store;
    }
}

function makeAdapter(): InMemoryAdapter {
    return new InMemoryAdapter();
}

describe("cosineSimilarity", () => {
    it("returns 1 for identical vectors", () => {
        expect(cosineSimilarityDense([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
    });

    it("returns 0 for orthogonal vectors", () => {
        expect(cosineSimilarityDense([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 6);
    });

    it("returns -1 for opposite vectors", () => {
        expect(cosineSimilarityDense([1, 0], [-1, 0])).toBeCloseTo(-1, 6);
    });

    it("returns a value in [-1, 1] for arbitrary vectors", () => {
        const sim = cosineSimilarityDense([0.5, 0.5], [0.3, 0.7]);
        expect(sim).toBeGreaterThanOrEqual(-1);
        expect(sim).toBeLessThanOrEqual(1);
    });

    it("returns 0 when either vector is empty", () => {
        expect(cosineSimilarityDense([], [1, 2])).toBe(0);
        expect(cosineSimilarityDense([1, 2], [])).toBe(0);
    });

    it("returns 0 when vectors have different lengths", () => {
        expect(cosineSimilarityDense([1, 0], [1, 0, 0])).toBe(0);
    });

    it("returns 0 when magnitude is zero", () => {
        expect(cosineSimilarityDense([0, 0], [1, 0])).toBe(0);
        expect(cosineSimilarityDense([1, 0], [0, 0])).toBe(0);
    });
});

describe("EmbeddingIndex", () => {
    it("starts empty", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        expect(idx.size).toBe(0);
        expect(idx.paths).toEqual([]);
    });

    it("stores and retrieves embeddings", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        idx.set("a.md", [1, 0, 0]);
        expect(idx.get("a.md")).toEqual([1, 0, 0]);
    });

    it("reports size correctly", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        idx.set("a.md", [1, 0, 0]);
        idx.set("b.md", [0, 1, 0]);
        expect(idx.size).toBe(2);
    });

    it("reports paths correctly", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        idx.set("b.md", [0, 1]);
        idx.set("a.md", [1, 0]);
        expect(idx.paths.sort()).toEqual(["a.md", "b.md"]);
    });

    it("checks existence with has()", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        idx.set("a.md", [1, 0]);
        expect(idx.has("a.md")).toBe(true);
        expect(idx.has("b.md")).toBe(false);
    });

    it("deletes entries", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        idx.set("a.md", [1, 0]);
        expect(idx.delete("a.md")).toBe(true);
        expect(idx.has("a.md")).toBe(false);
        expect(idx.size).toBe(0);
    });

    it("delete returns false for missing keys", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        expect(idx.delete("nonexistent.md")).toBe(false);
    });

    it("clear wipes all data", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        idx.set("a.md", [1, 0]);
        idx.set("b.md", [0, 1]);
        idx.clear();
        expect(idx.size).toBe(0);
        expect(idx.paths).toEqual([]);
    });

    it("similarityTo returns 0 for unindexed paths", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        expect(idx.similarityTo("missing.md", [1, 0])).toBe(0);
    });

    it("similarityTo returns cosine similarity for indexed paths", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        idx.set("a.md", [1, 0, 0]);
        expect(idx.similarityTo("a.md", [1, 0, 0])).toBeCloseTo(1, 6);
        expect(idx.similarityTo("a.md", [0, 1, 0])).toBeCloseTo(0, 6);
    });

    it("allSimilarities returns a map of all similarities", () => {
        const idx = new EmbeddingIndex(makeAdapter());
        idx.set("a.md", [1, 0]);
        idx.set("b.md", [0, 1]);
        const sims = idx.allSimilarities([0.5, 0.5]);
        expect(sims.size).toBe(2);
        expect(sims.get("a.md")).toBeCloseTo(0.707106, 4);
        expect(sims.get("b.md")).toBeCloseTo(0.707106, 4);
    });
});

describe("EmbeddingIndex persistence", () => {
    it("saves and loads data", async () => {
        const adapter = makeAdapter();
        const idx = new EmbeddingIndex(adapter);
        await idx.load("test-model");
        idx.set("a.md", [1, 0, 0]);
        idx.set("b.md", [0, 1, 0]);
        await idx.save();

        const idx2 = new EmbeddingIndex(adapter);
        await idx2.load("test-model");
        expect(idx2.size).toBe(2);
        expect(idx2.get("a.md")).toEqual([1, 0, 0]);
        expect(idx2.get("b.md")).toEqual([0, 1, 0]);
    });

    it("clears cache when model ID changes", async () => {
        const adapter = makeAdapter();
        const idx = new EmbeddingIndex(adapter);
        await idx.load("old-model");
        idx.set("a.md", [1, 0, 0]);
        await idx.save();

        const idx2 = new EmbeddingIndex(adapter);
        await idx2.load("new-model");
        expect(idx2.size).toBe(0);
    });

    it("handles empty storage gracefully", async () => {
        const idx = new EmbeddingIndex(makeAdapter());
        await idx.load("m");
        expect(idx.modelLabel).toBe("m");
        expect(idx.size).toBe(0);
    });

    it("does not save when empty", async () => {
        const adapter = makeAdapter();
        const idx = new EmbeddingIndex(adapter);
        await idx.load("m");
        await idx.save();
        expect(adapter.raw.size).toBe(0);
    });
});
