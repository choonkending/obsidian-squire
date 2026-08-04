import type { EmbeddingEngine } from "./types";
import type { SemanticService } from "./SemanticService";
import type { VaultFileReader, VaultEventSource } from "./vault";
import { EmbeddingIndex } from "./EmbeddingIndex";
import { stripMarkdown } from "../text";
import { MODELS } from "./models";

const INDEX_BATCH = 15;

type EventRegistrar = (event: unknown) => void;
type Notifier = (message: string) => void;

export class DefaultSemanticService implements SemanticService {
    private initialized = false;
    private ready = false;
    private building = false;
    private queryPrefix = "";
    private passagePrefix = "";

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

        const model = Object.values(MODELS).find(m => m.id === modelId);
        if (model) {
            this.queryPrefix = model.queryPrefix;
            this.passagePrefix = model.passagePrefix;
        }

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
        const prefixed = this.queryPrefix + clean;
        const queryEmbedding = await this.engine.computeEmbedding(prefixed);
        return this.index.allSimilarities(queryEmbedding);
    }

    private async warmup(): Promise<void> {
        if (this.ready || this.building) return;
        this.building = true;

        const files = this.reader.getMarkdownFiles();
        const total = files.length;
        const batchSize = INDEX_BATCH;
        const batches = Array.from(
            { length: Math.ceil(total / batchSize) },
            (_, i) => files.slice(i * batchSize, (i + 1) * batchSize),
        );

        await batches.reduce<Promise<number>>(
            async (acc, batch) => {
                const indexedSoFar = await acc;
                const unindexed = batch.filter(f => !this.index.has(f.path));
                if (unindexed.length > 0) {
                    await Promise.allSettled(unindexed.map(f => this.indexFile(f.path)));
                }
                const newIndexed = indexedSoFar + unindexed.length;

                await new Promise(r => window.setTimeout(r, 0));
                if (newIndexed > 0 && newIndexed % 10 === 0) {
                    this.notify(`Indexing notes for semantic search: ${newIndexed}/${total}`);
                }
                return newIndexed;
            },
            Promise.resolve(0),
        );

        await this.index.save();
        this.ready = true;
        this.building = false;
        if (total > 0) this.notify(`Semantic search index complete: ${total} notes`);
    }

    private async indexFile(path: string): Promise<void> {
        const text = await this.reader.readFile(path);
        const clean = stripMarkdown(text);
        const prefixed = this.passagePrefix + clean;
        const embedding = await this.engine.computeEmbedding(prefixed);
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
