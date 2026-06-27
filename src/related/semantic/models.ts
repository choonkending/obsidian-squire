export interface ModelInfo {
  id: string;
  label: string;
  dimension: number;
}

export const MODELS: Record<string, ModelInfo> = {
  GTE_SMALL: { id: "Xenova/gte-small", label: "Gte-small (33M params)", dimension: 384 },
  ALL_MINI_LM_L12_V2: { id: "Xenova/all-MiniLM-L12-v2", label: "All-MiniLM-L12-v2", dimension: 384 },
};

export const DEFAULT_MODEL_ID = MODELS.GTE_SMALL.id;
