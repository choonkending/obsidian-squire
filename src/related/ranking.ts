import LexicalEngine from "./LexicalEngine";
import type { NoteDoc, RelatedResult, RelatedWeights } from "./types";

export function combineScores(
    lexical: number,
    semantic: number | undefined
): number {
    if (semantic === undefined) return lexical;
    return (lexical + semantic) / 2;
}

export interface RelatedRequest {
    target: NoteDoc;
    candidates: NoteDoc[];
    weights: RelatedWeights;
    limit: number;
    semanticScores?: Map<string, number>;
}

export function rankRelatedNotes(request: RelatedRequest): Array<RelatedResult> {
    const { target, candidates, weights, limit, semanticScores } = request;

    const engine = new LexicalEngine();
    const ranked = engine.rank(target, candidates, candidates.length, weights);
    const lexicalScores = new Map<string, number>(
        ranked.map(r => [r.path, r.score])
    );

    const results: Array<RelatedResult> = [];
    for (const candidate of candidates) {
        if (candidate.path === target.path) continue;
        const lexical = lexicalScores.get(candidate.path) ?? 0;
        const semantic = semanticScores?.get(candidate.path);
        const combined = combineScores(lexical, semantic);
        if (combined > 0) {
            results.push({
                path: candidate.path,
                title: candidate.title,
                score: combined,
            });
        }
    }

    results.sort(
        (a, b) => b.score - a.score || a.title.localeCompare(b.title) || a.path.localeCompare(b.path)
    );

    return results.slice(0, limit);
}
