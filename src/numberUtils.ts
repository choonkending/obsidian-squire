const NUMERIC_PREFIX_REGEX = /^\d+(\.\d+)*$/;

export function isNumericPrefix(s: string): boolean {
    return NUMERIC_PREFIX_REGEX.test(s);
}

export function extractPrefix(title: string, separator: string): string | null {
    const result = title.split(separator);
    if (result.length <= 1) return null;
    return result[0].trim();
}

export function getLastSegments(siblingPrefixes: Array<string>, basePrefix: string): Array<number> {
    return siblingPrefixes
        .filter(s => {
            if (!s.startsWith(basePrefix)) return false;
            const remaining = s.slice(basePrefix.length);
            return remaining !== "" && !remaining.includes(".") && !isNaN(parseInt(remaining));
        })
        .map(s => parseInt(s.slice(basePrefix.length)));
}
