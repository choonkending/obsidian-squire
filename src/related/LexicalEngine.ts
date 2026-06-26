import { cosineSimilaritySparse, jaccardSimilarity } from "./text";
import type { NoteDoc, RelatedResult, RelatedWeights } from "./types";

export const DEFAULT_WEIGHTS: RelatedWeights = {
    words: 1.0,
    tags: 0.5,
    links: 0.5,
};

export default class LexicalEngine {
    score(
        target: NoteDoc,
        candidate: NoteDoc,
        weights: RelatedWeights = DEFAULT_WEIGHTS
    ): number {
        const { words, tags, links } = weights;
        const totalWeight = words + tags + links;

        if (totalWeight <= 0) {
            return 0;
        }

        const wordScore = cosineSimilaritySparse(target.tokens, candidate.tokens);
        const tagScore = jaccardSimilarity(target.tags, candidate.tags);
        const linkScore = jaccardSimilarity(target.links, candidate.links);

        const weighted =
            words * wordScore + tags * tagScore + links * linkScore;

        return weighted / totalWeight;
    }

    rank(
        target: NoteDoc,
        candidates: NoteDoc[],
        limit: number,
        weights: RelatedWeights = DEFAULT_WEIGHTS
    ): RelatedResult[] {
        if (limit <= 0) return [];

        return candidates
            .filter(c => c.path !== target.path)
            .map(c => ({ path: c.path, title: c.title, score: this.score(target, c, weights) }))
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title) || a.path.localeCompare(b.path))
            .slice(0, limit);
    }
}
