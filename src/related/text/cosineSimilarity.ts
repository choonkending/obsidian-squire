function magnitude(vector: Map<string, number>): number {
    let sum = 0;
    for (const weight of vector.values()) {
        sum += weight * weight;
    }
    return Math.sqrt(sum);
}

export function cosineSimilarity(
    a: Map<string, number>,
    b: Map<string, number>
): number {
    if (a.size === 0 || b.size === 0) {
        return 0;
    }

    const [small, large] = a.size <= b.size ? [a, b] : [b, a];

    let dot = 0;
    for (const [term, weight] of small) {
        const other = large.get(term);
        if (other !== undefined) {
            dot += weight * other;
        }
    }

    if (dot === 0) {
        return 0;
    }

    return dot / (magnitude(a) * magnitude(b));
}
