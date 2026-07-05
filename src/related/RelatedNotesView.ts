import { ItemView, MarkdownView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { RelatedNotesService } from "./RelatedNotesService";

export const RELATED_NOTES_VIEW_TYPE = "squire-related-notes";

function scoreClass(score: number): string {
    if (score >= 0.7) return "squire-related-score-high";
    if (score >= 0.4) return "squire-related-score-medium";
    return "squire-related-score-low";
}

export class RelatedNotesView extends ItemView {
    constructor(
        leaf: WorkspaceLeaf,
        private readonly service: RelatedNotesService,
        private readonly onCloseCallback: () => void
    ) {
        super(leaf);
    }

    getViewType(): string {
        return RELATED_NOTES_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Related notes";
    }

    getIcon(): string {
        return "network";
    }

    async onOpen(): Promise<void> {
        await this.refresh();
    }

    async onClose(): Promise<void> {
        this.onCloseCallback();
    }

    async refresh(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("squire-related-view");

        const header = container.createEl("div", { cls: "squire-related-header" });
        const titleRow = header.createEl("div", { cls: "squire-related-header-row" });
        titleRow.createEl("span", {
            text: "Related notes",
            cls: "squire-related-header-title",
        });
        titleRow.createEl("span", {
            text: this.service.algorithmLabel,
            cls: "squire-related-algorithm",
        });

        const file = this.app.workspace.getActiveFile();
        if (!file) {
            header.createEl("p", {
                text: "Open a note to see related notes.",
                cls: "squire-related-empty",
            });
            return;
        }

        const contentEl = container.createEl("div", { cls: "squire-related-content" });

        if (this.service.algorithmLabel !== "TF-IDF") {
            contentEl.createEl("p", {
                text: "Indexing notes...",
                cls: "squire-related-empty",
            });
        }

        const results = await this.service.findRelated(file);
        contentEl.empty();

        if (results.length === 0) {
            contentEl.createEl("p", {
                text: "No related notes found.",
                cls: "squire-related-empty",
            });
            return;
        }

        const list = contentEl.createEl("div", { cls: "squire-related-list" });
        for (const result of results) {
            const item = list.createEl("div", { cls: "squire-related-item" });

            item.createEl("div", {
                text: result.title,
                cls: "squire-related-title",
            });

            const meta = item.createEl("div", { cls: "squire-related-meta" });
            meta.createEl("span", {
                text: `${Math.round(result.score * 100)}% match`,
                cls: `squire-related-score ${scoreClass(result.score)}`,
            });

            const linkBtn = meta.createEl("button", {
                cls: "squire-link-btn",
                attr: { "aria-label": `Insert link to ${result.title}` },
                text: "Link",
            });

            item.addEventListener("click", (e: MouseEvent) => {
                if (e.button !== 0) return;
                const target = this.app.vault.getFileByPath(result.path);
                if (target instanceof TFile) {
                    void this.app.workspace.getLeaf().openFile(target);
                }
            });

            linkBtn.onClickEvent((e: MouseEvent) => {
                e.stopPropagation();
                this.insertLink(result.title);
            });

            item.addEventListener("contextmenu", (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                this.insertLink(result.title);
            });

            item.addEventListener("auxclick", (e: MouseEvent) => {
                if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.insertLink(result.title);
                }
            });
        }
    }

    private insertLink(title: string): void {
        const leaves = this.app.workspace.getLeavesOfType("markdown");
        const leaf = leaves[0];

        if (!leaf || !(leaf.view instanceof MarkdownView)) {
            new Notice("No editor open to insert link into.");
            return;
        }

        leaf.view.editor.replaceSelection(`[[${title}]]\n`);
        new Notice(`Inserted link to ${title}`);
    }
}
