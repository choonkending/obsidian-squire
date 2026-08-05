import type { EmbeddingVector } from "./types";
import { cosineSimilarityDense } from "../text";

const DEFAULT_STORAGE_KEY = "squire-embedding-index.json";

export interface DataAdapter {
    read(path: string): Promise<string>;
    write(path: string, data: string): Promise<void>;
}

export interface IndexEntry {
    path: string;
    embedding: EmbeddingVector;
}

export interface IndexData {
    modelId: string;
    entries: Array<IndexEntry>;
}

export class EmbeddingIndex {
    private modelId = "";
    private data = new Map<string, EmbeddingVector>();

    constructor(
        private readonly adapter: DataAdapter,
        private readonly storageKey: string = DEFAULT_STORAGE_KEY
    ) {}

    get modelLabel(): string {
        return this.modelId;
    }

    get size(): number {
        return this.data.size;
    }

    get paths(): Array<string> {
        return [...this.data.keys()];
    }

    get(path: string): EmbeddingVector | undefined {
        return this.data.get(path);
    }

    set(path: string, embedding: EmbeddingVector): void {
        this.data.set(path, embedding);
    }

    delete(path: string): boolean {
        return this.data.delete(path);
    }

    has(path: string): boolean {
        return this.data.has(path);
    }

    clear(): void {
        this.data.clear();
        this.modelId = "";
    }

    async load(modelId: string): Promise<void> {
        let raw: string | null;
        try {
            raw = await this.adapter.read(this.storageKey);
        } catch {
            raw = null;
        }
        if (raw === null) {
            this.modelId = modelId;
            return;
        }
        try {
            const parsed = JSON.parse(raw) as IndexData;
            if (parsed.modelId !== modelId) {
                this.clear();
                this.modelId = modelId;
                return;
            }
            this.modelId = parsed.modelId;
            this.data = new Map(
                parsed.entries.map(e => [e.path, e.embedding])
            );
        } catch {
            this.clear();
            this.modelId = modelId;
        }
    }

    async save(): Promise<void> {
        const data: IndexData = {
            modelId: this.data.size === 0 ? "" : this.modelId,
            entries: [...this.data.entries()].map(([path, embedding]) => ({
                path,
                embedding,
            })),
        };
        await this.adapter.write(this.storageKey, JSON.stringify(data));
    }

    allSimilarities(embedding: EmbeddingVector): Map<string, number> {
        return new Map(
            Array.from(this.data, ([path, stored]) => [
                path,
                cosineSimilarityDense(stored, embedding),
            ]),
        );
    }
}
