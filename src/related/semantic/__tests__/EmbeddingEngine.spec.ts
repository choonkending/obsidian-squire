import { FixedEmbeddingEngine } from "../testHelpers";

describe("FixedEmbeddingEngine", () => {
    it("returns a vector of the configured dimension", async () => {
        const engine = new FixedEmbeddingEngine(384);
        const vec = await engine.computeEmbedding("hello world");
        expect(vec).toHaveLength(384);
    });

    it("returns a vector of the default dimension (384)", async () => {
        const engine = new FixedEmbeddingEngine();
        const vec = await engine.computeEmbedding("test");
        expect(vec).toHaveLength(384);
    });

    it("exposes the dimension property", () => {
        expect(new FixedEmbeddingEngine(768).dimension).toBe(768);
    });

    it("returns unit vectors (normalized to length ~1)", async () => {
        const engine = new FixedEmbeddingEngine(384);
        const vec = await engine.computeEmbedding("any text");
        const magnitude = Math.sqrt(vec.reduce((sum: number, v: number) => sum + v * v, 0));
        expect(magnitude).toBeCloseTo(1, 4);
    });

    it("is deterministic: same text produces same vector", async () => {
        const engine = new FixedEmbeddingEngine(384);
        const [a, b] = await Promise.all([
            engine.computeEmbedding("same text"),
            engine.computeEmbedding("same text"),
        ]);
        expect(a).toEqual(b);
    });

    it("different texts produce different vectors", async () => {
        const engine = new FixedEmbeddingEngine(384);
        const [a, b] = await Promise.all([
            engine.computeEmbedding("alpha"),
            engine.computeEmbedding("beta"),
        ]);
        expect(a).not.toEqual(b);
    });

    it("empty string produces a valid unit vector", async () => {
        const engine = new FixedEmbeddingEngine(384);
        const vec = await engine.computeEmbedding("");
        expect(vec).toHaveLength(384);
        const magnitude = Math.sqrt(vec.reduce((sum: number, v: number) => sum + v * v, 0));
        expect(magnitude).toBeCloseTo(1, 4);
    });
});
