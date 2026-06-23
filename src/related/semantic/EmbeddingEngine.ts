import type { EmbeddingEngine, EmbeddingVector } from "./types";

function hashToFloat(text: string, index: number): number {
    let hash = 0;
    const combined = `${text}::${index}`;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const normalized = (hash % 10001) / 10000;
    return normalized * 2 - 1;
}

export class FixedEmbeddingEngine implements EmbeddingEngine {
    readonly dimension: number;

    constructor(dimension: number = 384) {
        this.dimension = dimension;
    }

    async computeEmbedding(text: string): Promise<EmbeddingVector> {
        const vector: EmbeddingVector = new Array(this.dimension);
        for (let i = 0; i < this.dimension; i++) {
            vector[i] = hashToFloat(text, i);
        }
        const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        if (magnitude > 0) {
            for (let i = 0; i < this.dimension; i++) {
                vector[i] /= magnitude;
            }
        }
        return vector;
    }
}
