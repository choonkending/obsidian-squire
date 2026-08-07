import { App, TFile } from "obsidian";
import type { SquireSettings } from "../types";
import type { NoteDoc } from "./types";
import type { RelatedResult, RelatedWeights } from "./types";
import type { SemanticService } from "./semantic";
import { NullSemanticService } from "./semantic";
import { rankRelatedNotes } from "./ranking";

export { combineScores } from "./ranking";

export class RelatedNotesService {
    algorithmLabel: string;

    constructor(
        private readonly app: App,
        private readonly getSettings: () => SquireSettings,
        private readonly buildNoteDoc: (app: App, file: TFile) => Promise<NoteDoc>,
        private readonly collectCandidates: (app: App, exclude?: TFile) => Promise<Array<NoteDoc>>,
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

    async findRelated(file: TFile): Promise<Array<RelatedResult>> {
        const settings = this.getSettings();

        let semanticScores: Map<string, number> | undefined;
        if (settings.semanticModelId) {
            const text = await this.app.vault.cachedRead(file);
            semanticScores = await this.semanticService.score(text) ?? undefined;
        }

        return rankRelatedNotes({
            target: await this.buildNoteDoc(this.app, file),
            candidates: await this.collectCandidates(this.app, file),
            weights: this.weights(),
            limit: settings.relatedNotesLimit,
            semanticScores,
        });
    }
}
