export interface RetrievalStats {
    precisionAtK: number;
    recallAtK: number;
    meanReciprocalRank: number;
}

export function relevantSet(relevant: Array<string>): Set<string> {
    return new Set(relevant);
}

export function precisionAtK(retrieved: Array<string>, relevant: Set<string>, k: number): number {
    if (k <= 0) return 0;
    const hits = retrieved.slice(0, k).filter(path => relevant.has(path)).length;
    return hits / k;
}

export function recallAtK(retrieved: Array<string>, relevant: Set<string>, k: number): number {
    if (relevant.size === 0) return 0;
    const hits = retrieved.slice(0, k).filter(path => relevant.has(path)).length;
    return hits / relevant.size;
}

export function reciprocalRank(retrieved: Array<string>, relevant: Set<string>): number {
    const index = retrieved.findIndex(path => relevant.has(path));
    return index === -1 ? 0 : 1 / (index + 1);
}

export function retrievalStats(
    retrieved: Array<string>,
    relevant: Array<string>,
    k: number
): RetrievalStats {
    const relevantPaths = relevantSet(relevant);
    return {
        precisionAtK: precisionAtK(retrieved, relevantPaths, k),
        recallAtK: recallAtK(retrieved, relevantPaths, k),
        meanReciprocalRank: reciprocalRank(retrieved, relevantPaths),
    };
}

export function average(stats: Array<RetrievalStats>): RetrievalStats {
    const sum = stats.reduce(
        (acc, stat) => ({
            precisionAtK: acc.precisionAtK + stat.precisionAtK,
            recallAtK: acc.recallAtK + stat.recallAtK,
            meanReciprocalRank: acc.meanReciprocalRank + stat.meanReciprocalRank,
        }),
        { precisionAtK: 0, recallAtK: 0, meanReciprocalRank: 0 }
    );
    const count = Math.max(stats.length, 1);
    return {
        precisionAtK: sum.precisionAtK / count,
        recallAtK: sum.recallAtK / count,
        meanReciprocalRank: sum.meanReciprocalRank / count,
    };
}