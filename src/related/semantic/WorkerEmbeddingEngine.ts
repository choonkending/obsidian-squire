import type { EmbeddingEngine, EmbeddingVector } from "./types";
import { MODELS } from "./models";

interface PendingCall {
  resolve: (vec: EmbeddingVector) => void;
  reject: (err: Error) => void;
}

interface BatchItem {
  id: string;
  text: string;
  resolve: (vec: EmbeddingVector) => void;
  reject: (err: Error) => void;
}

interface ReadyResult { type: "READY" }
interface ComputeResult { type: "RESULT"; id: string; data: Float32Array }
interface BatchResult { type: "RESULT_BATCH"; results: Array<{ id: string; data: Float32Array }> }
interface ErrorResult { type: "ERROR"; id: string; error: string }
interface ErrorBatchResult { type: "ERROR_BATCH"; error: string }
type WorkerResult = ReadyResult | ComputeResult | BatchResult | ErrorResult | ErrorBatchResult;

const BATCH_SIZE = 15;
const FLUSH_DELAY_MS = 10;

export class WorkerEmbeddingEngine implements EmbeddingEngine {
  readonly dimension: number;
  private worker: Worker;
  private ready: Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!: (err: Error) => void;
  private pending = new Map<string, PendingCall>();
  private batch: BatchItem[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private terminated = false;

  constructor(wasmBinary: Uint8Array, jsepSource: string, modelId: string, worker: Worker, dimension?: number) {
    this.dimension = dimension ?? MODELS[modelId]?.dimension ?? 384;
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    this.worker = worker;
    this.worker.onmessage = this.onMessage;
    this.worker.onerror = this.onError;

    this.worker.postMessage(
      {
        type: "INIT",
        wasmBinary: wasmBinary.buffer,
        jsepSource,
        modelId,
      },
      [wasmBinary.buffer],
    );
  }

  async computeEmbedding(text: string): Promise<EmbeddingVector> {
    await this.ready;
    if (this.terminated) {
      throw new Error("WorkerEmbeddingEngine has been terminated");
    }
    return new Promise<EmbeddingVector>((resolve, reject) => {
      this.batch.push({ id: crypto.randomUUID(), text, resolve, reject });
      if (this.batch.length >= BATCH_SIZE) {
        this.flushBatch();
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => this.flushBatch(), FLUSH_DELAY_MS);
      }
    });
  }

  terminate(): void {
    this.terminated = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.worker.terminate();
  }

  private flushBatch(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.batch.length === 0) return;

    const items = this.batch.splice(0, BATCH_SIZE);
    const batchItems = items.map(({ id, text }) => ({ id, text }));

    for (const item of items) {
      this.pending.set(item.id, { resolve: item.resolve, reject: item.reject });
    }

    this.worker.postMessage({ type: "COMPUTE_BATCH", items: batchItems });
  }

  private onMessage = (e: MessageEvent<WorkerResult>): void => {
    const msg = e.data;
    switch (msg.type) {
      case "READY":
        this.resolveReady();
        break;
      case "RESULT":
        this.resolvePending(msg.id, Array.from(msg.data));
        break;
      case "RESULT_BATCH":
        for (const result of msg.results) {
          this.resolvePending(result.id, Array.from(result.data));
        }
        break;
      case "ERROR":
        if (msg.id === "init") {
          this.rejectReady(new Error(msg.error));
        } else {
          this.rejectPending(msg.id, new Error(msg.error));
        }
        break;
      case "ERROR_BATCH":
        for (const item of this.batch) {
          item.reject(new Error(msg.error));
        }
        this.batch = [];
        for (const [, p] of this.pending) {
          p.reject(new Error(msg.error));
        }
        this.pending.clear();
        break;
    }
  };

  private onError = (e: ErrorEvent): void => {
    console.error("[WorkerEmbeddingEngine] Worker error:", e.message);
  };

  private resolvePending(id: string, vec: EmbeddingVector): void {
    const p = this.pending.get(id);
    if (p) {
      p.resolve(vec);
      this.pending.delete(id);
    }
  }

  private rejectPending(id: string, err: Error): void {
    const p = this.pending.get(id);
    if (p) {
      p.reject(err);
      this.pending.delete(id);
    }
  }
}
