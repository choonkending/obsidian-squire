export const MIN_RESULT_LIMIT = 1;
export const MAX_RESULT_LIMIT = 50;

export const DEFAULT_RESULT_LIMIT = 5;

export function normalizeResultLimit(
    raw: string,
    fallback: number = DEFAULT_RESULT_LIMIT
): number {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
        return fallback;
    }
    return Math.min(MAX_RESULT_LIMIT, Math.max(MIN_RESULT_LIMIT, parsed));
}

export function normalizeWeight(raw: string, fallback: number): number {
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return parsed;
}
