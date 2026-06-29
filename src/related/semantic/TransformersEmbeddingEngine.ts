import type { EmbeddingEngine, EmbeddingVector } from "./types";
import { pipeline, env } from "@huggingface/transformers";
import type { DataAdapter } from "obsidian";
import { DiskCache } from "./DiskCache";
import { DEFAULT_MODEL_ID, MODELS } from "./models";

async function setupEnv(pluginDir: string, adapter: DataAdapter): Promise<DiskCache> {

  const cache = new DiskCache(adapter, pluginDir);

  const wasmPath = `${pluginDir}/ort-wasm-simd-threaded.jsep.wasm`;
  let wasmBinary: Uint8Array | undefined;
  try {
    const buffer = await adapter.readBinary(wasmPath);
    wasmBinary = new Uint8Array(buffer);
  } catch (e) {
    console.warn("[transformers] Failed to load WASM binary:", e);
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
    if (wasmBinary) {
      env.backends.onnx.wasm.wasmBinary = wasmBinary;
    }
    env.backends.onnx.wasm.numThreads = 1;
    if (jsepBlobUrl) {
      env.backends.onnx.wasm.wasmPaths = { mjs: jsepBlobUrl };
    }
  }

  env.customCache = cache;
  env.useCustomCache = true;
  env.allowLocalModels = false;
  env.useFSCache = true;
  return cache;
}

let envInitialized = false;

type PipelineExtractor = (
  texts: string | string[],
  options?: { pooling?: string; normalize?: boolean }
) => Promise<{ data: Float32Array }>;

export async function createTransformersEngine(
  pluginDir: string,
  adapter: DataAdapter,
  modelId: string = DEFAULT_MODEL_ID,
  onProgress?: (pct: number) => void
): Promise<EmbeddingEngine> {
  if (!envInitialized) {
    const cache = await setupEnv(pluginDir, adapter);
    await cache.clearStale(Object.values(MODELS).map(m => m.id));
    envInitialized = true;
  }

  const extractor = await pipeline("feature-extraction", modelId, {
    dtype: "q8",
    progress_callback: onProgress
      ? (info) => {
          if (info.status === "progress") {
            onProgress(info.progress);
          }
        }
      : undefined,
  }) as unknown as PipelineExtractor;

  return {
    get dimension(): number {
      return MODELS[modelId]?.dimension ?? 384;
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
