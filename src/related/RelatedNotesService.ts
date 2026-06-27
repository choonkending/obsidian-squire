import { App, TFile } from "obsidian";
import type { SquireSettings } from "../types";
import LexicalEngine from "./LexicalEngine";
import { buildNoteDoc, collectCandidates } from "./vault";
import type { NoteDoc } from "./types";
import type { RelatedResult, RelatedWeights } from "./types";
import type { SemanticService } from "./semantic";
import { NullSemanticService } from "./semantic";

export function combineScores(
    lexical: number,
    semantic: number | undefined
): number {
    if (semantic === undefined) return lexical;
    return (lexical + semantic) / 2;
}

export class RelatedNotesService {
    private readonly engine = new LexicalEngine();
    algorithmLabel: string;

    constructor(
        private readonly app: App,
        private readonly getSettings: () => SquireSettings,
        private readonly buildNoteDoc: (app: App, file: TFile) => Promise<NoteDoc>,
        private readonly collectCandidates: (app: App, exclude?: TFile) => Promise<NoteDoc[]>,
        private semanticService: SemanticService = new NullSemanticService(),
        algorithmLabel = "TF-IDF"
    ) {
        this.algorithmLabel = algorithmLabel;
    }

    setSemanticService(svc: SemanticService): void {
        this.semanticService = svc;
    }

    private weights(): RelatedWeights {
        const s = this.getSettings();
        return { words: s.weightWords, tags: s.weightTags, links: s.weightLinks };
    }

    async findRelated(file: TFile): Promise<RelatedResult[]> {
        const settings = this.getSettings();
        const weights = this.weights();

        const target = await this.buildNoteDoc(this.app, file);
        const candidates = await this.collectCandidates(this.app, file);

        const ranked = this.engine.rank(target, candidates, candidates.length, weights);
        const lexicalScores = new Map<string, number>(
            ranked.map(r => [r.path, r.score])
        );

        let semanticScores: Map<string, number> | null = null;
        if (settings.semanticModelId) {
            const text = await this.app.vault.cachedRead(file);
            semanticScores = await this.semanticService.score(text);
        }

        const results: RelatedResult[] = [];

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

        return results.slice(0, settings.relatedNotesLimit);
    }
}
