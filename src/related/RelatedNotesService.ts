import { App, TFile } from "obsidian";
import type { ObsidianNoteDuplicatorSettings } from "../types";
import LexicalEngine from "./LexicalEngine";
import { buildNoteDoc, collectCandidates } from "./vault";
import type { NoteDoc } from "./types";
import type { RelatedResult, RelatedWeights } from "./types";

export class RelatedNotesService {
    private readonly engine = new LexicalEngine();

    constructor(
        private readonly app: App,
        private readonly getSettings: () => ObsidianNoteDuplicatorSettings,
        private readonly buildNoteDoc: (app: App, file: TFile) => Promise<NoteDoc>,
        private readonly collectCandidates: (app: App, exclude?: TFile) => Promise<NoteDoc[]>
    ) {}

    private weights(): RelatedWeights {
        const s = this.getSettings();
        return { words: s.weightWords, tags: s.weightTags, links: s.weightLinks };
    }

    async findRelated(file: TFile): Promise<RelatedResult[]> {
        const settings = this.getSettings();
        const target = await this.buildNoteDoc(this.app, file);
        const candidates = await this.collectCandidates(this.app, file);
        return this.engine.rank(target, candidates, settings.relatedNotesLimit, this.weights());
    }
}
