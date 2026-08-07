import { readFileSync } from "fs";
import { resolve } from "path";
import { DEFAULT_WEIGHTS } from "../src/related/LexicalEngine";
import { DEFAULT_RESULT_LIMIT } from "../src/related/settingsUtils";
import type { RelatedWeights } from "../src/related/types";

export interface EvalConfig {
    weights: RelatedWeights;
    limit: number;
}

interface DataJsonRect {
    weightWords?: number;
    weightTags?: number;
    weightLinks?: number;
    relatedNotesLimit?: number;
}

function readDataJson(root: string): DataJsonRect | null {
    try {
        return JSON.parse(readFileSync(resolve(root, "data.json"), "utf8")) as DataJsonRect;
    } catch {
        return null;
    }
}

function clampLimit(value: number | undefined): number {
    return typeof value === "number" && value > 0 ? Math.round(value) : DEFAULT_RESULT_LIMIT;
}

function clampWeight(value: number | undefined, fallback: number): number {
    return typeof value === "number" && value >= 0 ? value : fallback;
}

export function loadConfig(root: string = process.cwd()): EvalConfig {
    const data = readDataJson(root);
    return {
        weights: {
            words: clampWeight(data?.weightWords, DEFAULT_WEIGHTS.words),
            tags: clampWeight(data?.weightTags, DEFAULT_WEIGHTS.tags),
            links: clampWeight(data?.weightLinks, DEFAULT_WEIGHTS.links),
        },
        limit: clampLimit(data?.relatedNotesLimit),
    };
}