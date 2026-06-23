import type { EmbeddingEngine, EmbeddingVector } from "./types";
import { pipeline, env } from "@huggingface/transformers";
import type { DataAdapter } from "obsidian";

class DiskCache {
  constructor(
    private readonly adapter: DataAdapter,
    private readonly basePath: string
  ) {}

  private getCacheDir(): string {
    return `${this.basePath}/.cache/transformers`;
  }

  private sanitizeKey(key: string): string {
    return key.replace(/:\/\//g, "_").replace(/\//g, "_");
  }

  private getFilePath(key: string): string {
    return `${this.getCacheDir()}/${this.sanitizeKey(key)}`;
  }

  async match(request: string): Promise<Response | undefined> {
    const filePath = this.getFilePath(request);
    try {
      const buffer = await this.adapter.readBinary(filePath);
      return new Response(new Uint8Array(buffer));
    } catch {
      return undefined;
    }
  }

  async put(request: string, response: Response): Promise<void> {
    const filePath = this.getFilePath(request);
    await this.adapter.mkdir(this.getCacheDir()).catch(() => {});
    const arrayBuffer = await response.arrayBuffer();
    await this.adapter.writeBinary(filePath, arrayBuffer);
  }

  async delete(request: string): Promise<boolean> {
    const filePath = this.getFilePath(request);
    try {
      await this.adapter.remove(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

async function setupEnv(pluginDir: string, adapter: DataAdapter): Promise<void> {
  if (!pluginDir) {
    console.warn("[transformers] pluginDir not provided; using fallback paths");
    return;
  }

  const wasmPath = `${pluginDir}/ort-wasm-simd-threaded.jsep.wasm`;
  let wasmBinary: Uint8Array;
  try {
    const buffer = await adapter.readBinary(wasmPath);
    wasmBinary = new Uint8Array(buffer);
  } catch (e) {
    console.warn("[transformers] Failed to load WASM binary:", e);
    return;
  }

  let jsepBlobUrl: string | undefined;
  try {
    const jsepPath = `${pluginDir}/ort-wasm-simd-threaded.jsep.mjs`;
    const jsepBuffer = await adapter.readBinary(jsepPath);
    const jsepCode = new TextDecoder().decode(jsepBuffer);
    const blob = new Blob([jsepCode], { type: "application/javascript" });
    jsepBlobUrl = URL.createObjectURL(blob);
  } catch (e) {
    console.warn("[transformers] Failed to load JSEP module:", e);
  }

  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.wasmBinary = wasmBinary;
    env.backends.onnx.wasm.numThreads = 1;
    if (jsepBlobUrl) {
      env.backends.onnx.wasm.wasmPaths = { mjs: jsepBlobUrl };
    }
  }

  env.customCache = new DiskCache(adapter, pluginDir);
  env.useCustomCache = true;
  env.allowLocalModels = false;
  env.useFSCache = true;
}

let envInitialized = false;

type PipelineExtractor = (
  texts: string | string[],
  options?: { pooling?: string; normalize?: boolean }
) => Promise<{ data: Float32Array; dims: number[] }>;

export async function createTransformersEngine(
  pluginDir: string,
  adapter: DataAdapter,
  modelId: string = "Xenova/gte-small"
): Promise<EmbeddingEngine> {
  if (!envInitialized) {
    await setupEnv(pluginDir, adapter);
    envInitialized = true;
  }

  const extractor = await pipeline("feature-extraction", modelId, {
    dtype: "q8",
  }) as unknown as PipelineExtractor;

  return {
    get dimension(): number {
      return 384;
    },
    computeEmbedding: async (text: string): Promise<EmbeddingVector> => {
      const result = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });
      return Array.from(result.data);
    },
  };
}
