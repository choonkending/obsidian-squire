import { pipeline, env } from "@huggingface/transformers";

// TypeScript-compatible export. At build time, esbuild's inlineWorkerPlugin
// intercepts this module and generates the actual worker URL.
export const workerUrl = "";

// The worker runs from a blob: URL. ONNX Runtime's WebGPU backend tries to
// create sub-workers using import.meta.url, which resolves to the blob URL and
// can't load ort.webgpu.bundle.min.mjs. Always use WASM inside the worker.
const BACKEND_DEVICE = "wasm";

type PipelineFn = (
  texts: string | string[],
  options?: { pooling?: string; normalize?: boolean }
) => Promise<{ data: Float32Array }>;

interface InitMessage {
  type: "INIT";
  wasmBinary: ArrayBuffer;
  jsepSource: string;
  modelId: string;
}

interface ComputeMessage {
  type: "COMPUTE";
  id: string;
  text: string;
}

interface ComputeBatchMessage {
  type: "COMPUTE_BATCH";
  items: Array<{ id: string; text: string }>;
}

type WorkerInMessage = InitMessage | ComputeMessage | ComputeBatchMessage;

let extractor: PipelineFn | null = null;

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case "INIT":
      await handleInit(msg);
      break;
    case "COMPUTE":
      await handleCompute(msg);
      break;
    case "COMPUTE_BATCH":
      await handleComputeBatch(msg);
      break;
  }
};

async function handleInit(msg: InitMessage): Promise<void> {
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.wasmBinary = new Uint8Array(msg.wasmBinary);
    env.backends.onnx.wasm.numThreads = 1;
    const blob = new Blob([msg.jsepSource], { type: "application/javascript" });
    env.backends.onnx.wasm.wasmPaths = { mjs: URL.createObjectURL(blob) };
  }
  env.allowLocalModels = false;

  try {
    extractor = (await pipeline("feature-extraction", msg.modelId, {
      dtype: "q8",
      device: BACKEND_DEVICE,
    })) as unknown as PipelineFn;
  } catch (err) {
    globalThis.postMessage({
      type: "ERROR",
      id: "init",
      error: `Pipeline error: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }
  globalThis.postMessage({ type: "READY" });
}

async function handleCompute(msg: ComputeMessage): Promise<void> {
  if (!extractor) {
    globalThis.postMessage({ type: "ERROR", id: msg.id, error: "Worker not initialized" });
    return;
  }
  try {
    const result = await extractor(msg.text, { pooling: "mean", normalize: true });
    globalThis.postMessage(
      { type: "RESULT", id: msg.id, data: result.data },
      { transfer: [result.data.buffer] },
    );
  } catch (e) {
    globalThis.postMessage({ type: "ERROR", id: msg.id, error: String(e) });
  }
}

async function handleComputeBatch(msg: ComputeBatchMessage): Promise<void> {
  if (!extractor) {
    globalThis.postMessage({ type: "ERROR_BATCH", error: "Worker not initialized" });
    return;
  }
  try {
    const texts = msg.items.map((i) => i.text);
    const result = await extractor(texts, { pooling: "mean", normalize: true });
    const dim = result.data.length / texts.length;
    const buffers: ArrayBuffer[] = [];
    const results = msg.items.map((item, i) => {
      const slice = result.data.slice(i * dim, (i + 1) * dim);
      buffers.push(slice.buffer);
      return { id: item.id, data: slice };
    });
    globalThis.postMessage({ type: "RESULT_BATCH", results }, { transfer: buffers });
  } catch (e) {
    globalThis.postMessage({ type: "ERROR_BATCH", error: String(e) });
  }
}
