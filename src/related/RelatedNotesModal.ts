import { App, SuggestModal, TFile } from "obsidian";
import type { RelatedResult } from "./types";

export class RelatedNotesModal extends SuggestModal<RelatedResult> {
    constructor(
        app: App,
        private readonly results: RelatedResult[]
    ) {
        super(app);
        this.setPlaceholder(
            results.length > 0
                ? "Select a related note to open"
                : "No related notes found"
        );
    }

    getSuggestions(query: string): RelatedResult[] {
        const lowered = query.toLowerCase().trim();
        if (lowered.length === 0) {
            return this.results;
        }
        return this.results.filter(result =>
            result.title.toLowerCase().includes(lowered)
        );
    }

    renderSuggestion(result: RelatedResult, el: HTMLElement): void {
        const score = `${Math.round(result.score * 100)}% match`;
        el.createEl("div", { text: result.title, cls: "squire-related-title" });
        el.createEl("small", {
            text: `${score} · ${result.path}`,
            cls: "squire-related-meta",
        });
    }

    onChooseSuggestion(result: RelatedResult): void {
        const file = this.app.vault.getFileByPath(result.path);
        if (file instanceof TFile) {
            void this.app.workspace.getLeaf().openFile(file);
        }
    }
}
