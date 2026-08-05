export type EmbeddingVector = Array<number>;

export interface EmbeddingEngine {
    computeEmbedding(text: string): Promise<EmbeddingVector>;
    readonly dimension: number;
}
