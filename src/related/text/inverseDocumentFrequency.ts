import { termFrequencies } from "./termFrequency";

export function computeInverseDocumentFrequencies(
    documents: Array<Map<string, number>>
): Map<string, number> {
    const documentCount = documents.length;
    if (documentCount === 0) return new Map();

    const documentFrequencies = termFrequencies(
        documents.flatMap(document => [...document.keys()])
    );

    return new Map(
        Array.from(
            documentFrequencies,
            ([term, documentFrequency]): [string, number] =>
                [term, 1 + Math.log(documentCount / documentFrequency)]
        )
    );
}

export function applyInverseDocumentFrequency(
    termFrequency: Map<string, number>,
    inverseDocumentFrequency: Map<string, number>
): Map<string, number> {
    if (inverseDocumentFrequency.size === 0) return termFrequency;

    return new Map(
        Array.from(termFrequency).flatMap(
            ([term, frequency]): Array<[string, number]> => {
                const weight = inverseDocumentFrequency.get(term);
                return weight === undefined ? [] : [[term, frequency * weight]];
            }
        )
    );
}
