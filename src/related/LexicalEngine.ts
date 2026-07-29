import { cosineSimilaritySparse, jaccardSimilarity, computeInverseDocumentFrequencies, applyInverseDocumentFrequency } from "./text";
import type { NoteDoc, RelatedResult, RelatedWeights } from "./types";

export const DEFAULT_WEIGHTS: RelatedWeights = {
    words: 1.0,
    tags: 0.5,
    links: 0.5,
};

export default class LexicalEngine {
    private score(
        target: NoteDoc,
        candidate: NoteDoc,
        weights: RelatedWeights = DEFAULT_WEIGHTS
    ): number {
        return this.makeScorer(target, weights)(candidate);
    }

    rank(
        target: NoteDoc,
        candidates: NoteDoc[],
        limit: number,
        weights: RelatedWeights = DEFAULT_WEIGHTS
    ): RelatedResult[] {
        if (limit <= 0) return [];

        const inverseDocumentFrequency = computeInverseDocumentFrequencies(
            [target, ...candidates].map(d => d.tokens)
        );
        const scorer = this.makeScorer(target, weights, inverseDocumentFrequency);

        return candidates
            .filter(c => c.path !== target.path)
            .map(c => ({ path: c.path, title: c.title, score: scorer(c) }))
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title) || a.path.localeCompare(b.path))
            .slice(0, limit);
    }

    private makeScorer(
        target: NoteDoc,
        weights: RelatedWeights,
        inverseDocumentFrequency: Map<string, number> = new Map()
    ): (candidate: NoteDoc) => number {
        const { words, tags, links } = weights;
        const totalWeight = words + tags + links;
        const targetWordVector = applyInverseDocumentFrequency(target.tokens, inverseDocumentFrequency);

        return (candidate) => {
            if (totalWeight <= 0) {
                return 0;
            }

            const candidateWordVector = applyInverseDocumentFrequency(candidate.tokens, inverseDocumentFrequency);

            const wordScore = cosineSimilaritySparse(targetWordVector, candidateWordVector);
            const tagScore = jaccardSimilarity(target.tags, candidate.tags);
            const linkScore = jaccardSimilarity(target.links, candidate.links);

            return (words * wordScore + tags * tagScore + links * linkScore) / totalWeight;
        };
    }
}
