export type EmbeddingVector = number[];

export interface EmbeddingEngine {
    computeEmbedding(text: string): Promise<EmbeddingVector>;
    readonly dimension: number;
}
