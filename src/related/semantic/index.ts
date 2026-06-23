export type { EmbeddingEngine, EmbeddingVector } from "./types";
export { FixedEmbeddingEngine } from "./EmbeddingEngine";
export { createTransformersEngine } from "./TransformersEmbeddingEngine";
export { EmbeddingIndex } from "./EmbeddingIndex";
export type { DataAdapter, IndexEntry, IndexData } from "./EmbeddingIndex";
export type { SemanticService } from "./SemanticService";
export type { VaultFileReader, VaultEventSource } from "./vault";
export { DefaultSemanticService } from "./DefaultSemanticService";
export { NullSemanticService } from "./NullSemanticService";
