import { termFrequencies } from "./termFrequency";

export function computeInverseDocumentFrequencies(
    documents: Map<string, number>[]
): Map<string, number> {
    const documentCount = documents.length;
    if (documentCount === 0) return new Map();

    const documentFrequencies = termFrequencies(
        documents.flatMap(document => [...document.keys()])
    );

    const inverseDocumentFrequency = new Map<string, number>();
    for (const [term, count] of documentFrequencies) {
        inverseDocumentFrequency.set(term, 1 + Math.log(documentCount / count));
    }
    return inverseDocumentFrequency;
}

export function applyInverseDocumentFrequency(
    termFrequency: Map<string, number>,
    inverseDocumentFrequency: Map<string, number>
): Map<string, number> {
    if (inverseDocumentFrequency.size === 0) return termFrequency;

    const result = new Map<string, number>();
    for (const [term, frequency] of termFrequency) {
        const weight = inverseDocumentFrequency.get(term);
        if (weight !== undefined) {
            result.set(term, frequency * weight);
        }
    }
    return result;
}
