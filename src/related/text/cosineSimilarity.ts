function sparseMagnitude(vector: Map<string, number>): number {
    let sum = 0;
    for (const weight of vector.values()) {
        sum += weight * weight;
    }
    return Math.sqrt(sum);
}

export function cosineSimilaritySparse(
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

    return dot / (sparseMagnitude(a) * sparseMagnitude(b));
}

export function cosineSimilarityDense(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
        return 0;
    }
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    if (denom === 0) {
        return 0;
    }
    return dot / denom;
}
