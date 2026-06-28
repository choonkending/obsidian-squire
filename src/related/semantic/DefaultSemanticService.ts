import type { EmbeddingEngine } from "./types";
import type { SemanticService } from "./SemanticService";
import type { VaultFileReader, VaultEventSource } from "./vault";
import { EmbeddingIndex } from "./EmbeddingIndex";
import { stripMarkdown } from "../text";
type EventRegistrar = (event: unknown) => void;
type Notifier = (message: string) => void;

export class DefaultSemanticService implements SemanticService {
    private initialized = false;
    private ready = false;
    private building = false;

    constructor(
        private readonly reader: VaultFileReader,
        private readonly events: VaultEventSource,
        private readonly engine: EmbeddingEngine,
        private readonly index: EmbeddingIndex,
        private readonly registerEvent: EventRegistrar,
        private readonly notify: Notifier
    ) {}

    async init(modelId: string): Promise<void> {
        this.initialized = true;
        await this.index.load(modelId);
        this.registerVaultEvents();
        if (this.index.size > 0) {
            this.ready = true;
        }
    }

    async score(queryText: string): Promise<Map<string, number> | null> {
        if (!this.initialized) return null;
        await this.warmup();
        if (!this.ready) {
            return null;
        }
        const clean = stripMarkdown(queryText);
        const queryEmbedding = await this.engine.computeEmbedding(clean);
        return this.index.allSimilarities(queryEmbedding);
    }

    private async warmup(): Promise<void> {
        if (this.ready || this.building) {
            return;
        }
        this.building = true;

        const files = this.reader.getMarkdownFiles();
        const total = files.length;

        for (let i = 0; i < total; i++) {
            const file = files[i];
            if (this.index.has(file.path)) {
                continue;
            }
            try {
                await this.indexFile(file.path);
            } catch {
                // skip files that fail to read
            }
            if (i % 10 === 0 && i > 0) {
                this.notify(`Indexing notes for semantic search: ${i}/${total}`);
            }
        }

        await this.index.save();
        this.ready = true;
        this.building = false;
        if (total > 0) {
            this.notify(`Semantic search index complete: ${total} notes`);
        }
    }

    private async indexFile(path: string): Promise<void> {
        const text = await this.reader.readFile(path);
        const clean = stripMarkdown(text);
        const embedding = await this.engine.computeEmbedding(clean);
        this.index.set(path, embedding);
    }

    private async reindexFile(file: { path: string }): Promise<void> {
        if (!file.path.endsWith(".md")) return;
        try {
            await this.indexFile(file.path);
            await this.index.save();
        } catch {
            // skip
        }
    }

    private registerVaultEvents(): void {
        this.registerEvent(this.events.on("modify", (file) => { void this.reindexFile(file); }));
        this.registerEvent(this.events.on("create", (file) => { void this.reindexFile(file); }));
        this.registerEvent(
            this.events.on("delete", (file) => {
                this.index.delete(file.path);
                void this.index.save();
            })
        );
    }
}
