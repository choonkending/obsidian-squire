/**
 * @jest-environment jsdom
 */

import { DefaultSemanticService } from "../DefaultSemanticService";
import type { VaultFileReader, VaultEventSource } from "../vault";
import type { DataAdapter } from "../EmbeddingIndex";
import { EmbeddingIndex } from "../EmbeddingIndex";
import { FixedEmbeddingEngine } from "../testHelpers";
import type { EmbeddingVector } from "../types";

class RecordingEngine extends FixedEmbeddingEngine {
    calls: Array<string> = [];

    async computeEmbedding(text: string): Promise<EmbeddingVector> {
        this.calls.push(text);
        return super.computeEmbedding(text);
    }
}

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
}

function makeReader(
    files: Array<{ path: string; content: string }>
): VaultFileReader {
    return {
        getMarkdownFiles: () => files.map(f => ({ path: f.path, extension: "md" })),
        readFile: async (path: string) => files.find(f => f.path === path)?.content ?? "",
    };
}

function makeEvents(): VaultEventSource & { handlers: Map<string, (...args: Array<unknown>) => void> } {
    const handlers = new Map<string, (...args: Array<unknown>) => void>();
    return {
        handlers,
        on: ((event, handler) => {
            handlers.set(event as string, handler as (...args: Array<unknown>) => void);
            return "event-ref";
        }) as VaultEventSource['on'],
    };
}

describe("DefaultSemanticService", () => {
    it("score returns null when not initialized", async () => {
        const svc = new DefaultSemanticService(
            makeReader([]),
            makeEvents(),
            new FixedEmbeddingEngine(4),
            new EmbeddingIndex(new InMemoryAdapter()),
            () => {},
            () => {},
        );
        const result = await svc.score("test");
        expect(result).toBeNull();
    });

    it("score returns similarity map for all files", async () => {
        const reader = makeReader([
            { path: "a.md", content: "alpha" },
            { path: "b.md", content: "beta" },
        ]);
        const idx = new EmbeddingIndex(new InMemoryAdapter());
        const svc = new DefaultSemanticService(
            reader,
            makeEvents(),
            new FixedEmbeddingEngine(4),
            idx,
            () => {},
            () => {},
        );
        await svc.init("m");

        const sims = await svc.score("alpha");
        expect(sims).not.toBeNull();
        expect(sims!.size).toBe(2);
        expect(idx.has("a.md")).toBe(true);
        expect(idx.has("b.md")).toBe(true);
    });

    it("vault modify event re-indexes the modified file", async () => {
        const reader = makeReader([
            { path: "a.md", content: "original" },
            { path: "b.md", content: "unchanged" },
        ]);
        const events = makeEvents();
        const idx = new EmbeddingIndex(new InMemoryAdapter());
        const svc = new DefaultSemanticService(
            reader,
            events,
            new FixedEmbeddingEngine(4),
            idx,
            () => {},
            () => {},
        );
        await svc.init("m");
        idx.set("a.md", [1, 0, 0, 0]);
        idx.set("b.md", [1, 0, 0, 0]);

        const handler = events.handlers.get("modify");
        if (handler) {
            handler({ path: "a.md", extension: "md" });
        }

        expect(idx.has("a.md")).toBe(true);
        expect(idx.has("b.md")).toBe(true);
    });

    it("vault delete event removes the file from index", async () => {
        const reader = makeReader([
            { path: "a.md", content: "text" },
        ]);
        const events = makeEvents();
        const idx = new EmbeddingIndex(new InMemoryAdapter());
        const svc = new DefaultSemanticService(
            reader,
            events,
            new FixedEmbeddingEngine(4),
            idx,
            () => {},
            () => {},
        );
        await svc.init("m");
        idx.set("a.md", [1, 0, 0, 0]);

        const handler = events.handlers.get("delete");
        if (handler) {
            handler({ path: "a.md" });
        }

        expect(idx.has("a.md")).toBe(false);
    });
});

describe("SemanticService prefixes", () => {
    it("score() prepends query: prefix for GTE-small model", async () => {
        const reader = makeReader([
            { path: "a.md", content: "some text" },
        ]);
        const engine = new RecordingEngine(4);
        const svc = new DefaultSemanticService(
            reader,
            makeEvents(),
            engine,
            new EmbeddingIndex(new InMemoryAdapter()),
            () => {},
            () => {},
        );
        await svc.init("Xenova/gte-small");
        await svc.score("test query");
        const lastCall = engine.calls[engine.calls.length - 1];
        expect(lastCall).toBe("query: test query");
    });

    it("warmup indexes documents with passage: prefix for GTE-small", async () => {
        const reader = makeReader([
            { path: "a.md", content: "doc alpha" },
            { path: "b.md", content: "doc beta" },
        ]);
        const engine = new RecordingEngine(4);
        const svc = new DefaultSemanticService(
            reader,
            makeEvents(),
            engine,
            new EmbeddingIndex(new InMemoryAdapter()),
            () => {},
            () => {},
        );
        await svc.init("Xenova/gte-small");
        await svc.score("test");
        const indexCalls = engine.calls.filter(
            c => c.startsWith("passage: ")
        );
        expect(indexCalls).toEqual([
            "passage: doc alpha",
            "passage: doc beta",
        ]);
    });

    it("score() passes text through unchanged for model without prefix", async () => {
        const reader = makeReader([
            { path: "a.md", content: "text" },
        ]);
        const engine = new RecordingEngine(4);
        const svc = new DefaultSemanticService(
            reader,
            makeEvents(),
            engine,
            new EmbeddingIndex(new InMemoryAdapter()),
            () => {},
            () => {},
        );
        await svc.init("Xenova/all-MiniLM-L12-v2");
        await svc.score("plain query");
        const lastCall = engine.calls[engine.calls.length - 1];
        expect(lastCall).toBe("plain query");
    });
});
