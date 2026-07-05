import { Notice, Plugin, TAbstractFile, TFile, debounce, EventRef } from 'obsidian';
import config from './config';
import type { SquireSettings } from './types';
import type { TransformResult } from './transformers';
import { SquireSettingsTab, DEFAULT_SETTINGS } from './settings';
import { generateNewDocumentPath } from './pathUtils';
import { isNumericPrefix, extractPrefix } from './numberUtils';
import {
    RelatedNotesService,
    RelatedNotesModal,
    RelatedNotesView,
    RELATED_NOTES_VIEW_TYPE,
    buildNoteDoc,
    collectCandidates,
} from './related';
import type { SemanticService, VaultFileReader, EmbeddingEngine } from './related/semantic';
import {
    WorkerEmbeddingEngine,
    EmbeddingIndex,
    DefaultSemanticService,
    NullSemanticService,
} from './related/semantic';
import { DiskCache } from './related/semantic/DiskCache';
import { workerUrl } from './related/semantic/indexer.worker';

export default class SquirePlugin extends Plugin {
    settings: SquireSettings;
    private transformerMenuRef: EventRef | null = null;
    relatedNotesService: RelatedNotesService;
    private currentModelId = "";
    private statusBarItem: HTMLElement;

    onunload() {
        this.removeCommand('show-related-notes');
        this.removeCommand('toggle-related-notes-view');
    }

    async onload() {
        await this.loadSettings();

        this.statusBarItem = this.addStatusBarItem();
        this.statusBarItem.addClass('squire-status-hidden');

        this.currentModelId = this.settings.semanticModelId;
        this.relatedNotesService = new RelatedNotesService(
            this.app,
            () => this.settings,
            buildNoteDoc,
            collectCandidates,
            await this.initSemanticService(),
            this.algorithmLabel()
        );

        this.addSettingTab(new SquireSettingsTab(this.app, this));
        this.registerTransformers();
        this.registerRelatedNotes();
        this.app.workspace.onLayoutReady(() => {
            if (this.settings.showRelatedNotesSidebar) {
                void this.openRelatedNotesLeaf();
            }
        });
    }

    private algorithmLabel(): string {
        if (!this.settings.semanticModelId) return "TF-IDF";
        return `Hybrid: TF-IDF + ${this.semanticModelShortName()}`;
    }

    private semanticModelShortName(): string {
        const id = this.settings.semanticModelId;
        const short = id.includes("/") ? id.split("/")[1] : id;
        return `Model: ${short}`;
    }

    private async initSemanticService(onProgress?: (pct: number) => void): Promise<SemanticService> {
        if (!this.settings.semanticModelId) {
            return new NullSemanticService();
        }

        const index = new EmbeddingIndex(this.app.vault.adapter, `${this.app.vault.configDir}/squire-embedding-index.json`);
        let engine: EmbeddingEngine;
        try {
            const pluginDir = this.manifest.dir ?? "";
            const adapter = this.app.vault.adapter;
            const wasmBuffer = await adapter.readBinary(`${pluginDir}/ort-wasm-simd-threaded.jsep.wasm`);
            const jsepBuffer = await adapter.readBinary(`${pluginDir}/ort-wasm-simd-threaded.jsep.mjs`);
            const jsepSource = new TextDecoder().decode(jsepBuffer)
                .replace(/globalThis\.process\?\.versions\?\.node/g, "false");
            const worker = new Worker(workerUrl);
            engine = new WorkerEmbeddingEngine(
                new Uint8Array(wasmBuffer),
                jsepSource,
                this.settings.semanticModelId,
                worker,
            );
        } catch (e) {
            new Notice(`Semantic search unavailable: ${e instanceof Error ? e.message : e}; falling back to TF-IDF`);
            this.settings.semanticModelId = '';
            void this.saveSettings();
            return new NullSemanticService();
        }
        const reader: VaultFileReader = {
            getMarkdownFiles: () => this.app.vault.getMarkdownFiles(),
            readFile: async (path: string) => {
                const file = this.app.vault.getFileByPath(path);
                return file ? await this.app.vault.cachedRead(file) : "";
            },
        };
        const svc = new DefaultSemanticService(
            reader,
            this.app.vault,
            engine,
            index,
            (evt) => this.registerEvent(evt as EventRef),
            (msg) => new Notice(msg)
        );
        await svc.init(this.settings.semanticModelId);
        return svc;
    }

    private registerRelatedNotes() {
        this.registerView(
            RELATED_NOTES_VIEW_TYPE,
            leaf => new RelatedNotesView(leaf, this.relatedNotesService, () => {
                this.settings.showRelatedNotesSidebar = false;
                void this.saveSettings();
            })
        );

        this.addRibbonIcon('network', 'Toggle related notes sidebar', () =>
            this.toggleRelatedNotesView()
        );

        this.addCommand({
            id: 'show-related-notes',
            name: 'Show related notes',
            callback: async () => {
                const file = this.app.workspace.getActiveFile();
                if (!file) {
                    new Notice('No active file to find related notes for.');
                    return;
                }
                try {
                    const results = await this.relatedNotesService.findRelated(file);
                    new RelatedNotesModal(this.app, results).open();
                } catch (error) {
                    new Notice(`Failed to find related notes: ${error}`);
                }
            }
        });

        this.addCommand({
            id: 'toggle-related-notes-view',
            name: 'Toggle related notes sidebar',
            callback: () => this.toggleRelatedNotesView()
        });

        const refresh = debounce(() => this.refreshRelatedNotesViews(), 400);
        this.registerEvent(this.app.workspace.on('active-leaf-change', refresh));
        this.registerEvent(this.app.workspace.on('file-open', refresh));
    }

    private async openRelatedNotesLeaf(): Promise<void> {
        const rightLeaf = this.app.workspace.getRightLeaf(false);
        if (!rightLeaf) return;
        await rightLeaf.setViewState({ type: RELATED_NOTES_VIEW_TYPE, active: true });
        await this.app.workspace.revealLeaf(rightLeaf);
    }

    private async toggleRelatedNotesView() {
        const existing = this.app.workspace.getLeavesOfType(RELATED_NOTES_VIEW_TYPE)[0];
        if (existing) {
            existing.detach();
            return;
        }
        this.settings.showRelatedNotesSidebar = true;
        await this.saveSettings();
        await this.openRelatedNotesLeaf();
    }

    private refreshRelatedNotesViews() {
        for (const leaf of this.app.workspace.getLeavesOfType(RELATED_NOTES_VIEW_TYPE)) {
            const view = leaf.view;
            if (view instanceof RelatedNotesView) {
                void view.refresh();
            }
        }
    }

    private registerTransformers() {
        if (this.transformerMenuRef) {
            this.app.workspace.offref(this.transformerMenuRef);
            this.transformerMenuRef = null;
        }

        const ref = this.app.workspace.on('file-menu', (menu, file) => {
            for (const configItem of config) {
                const transformer = new configItem.transformer(this.settings.indexSeparator);
                menu.addItem(item =>
                    item
                        .setTitle(configItem.title)
                        .setIcon('document')
                        .onClick(async () => await this.duplicateWithTransform(file, transformer.transform))
                );
            }
        });
        this.registerEvent(ref);
        this.transformerMenuRef = ref;
    }

    private getNumericPrefixes(file: TAbstractFile): string[] {
        const parent = file.parent;
        if (!parent) return [];
        return parent.children
            .filter(c => c instanceof TFile && c.extension === 'md' && c.name !== file.name)
            .map(c => extractPrefix(c.name, this.settings.indexSeparator))
            .filter((p): p is string => p !== null && isNumericPrefix(p));
    }

    private async duplicateWithTransform(file: TAbstractFile, transform: (title: string, siblingPrefixes: string[]) => TransformResult) {
        const result = transform(file.name, this.getNumericPrefixes(file));

        if (result.status === 'SUCCESS') {
            const transformedTitle = result.transformedTitle;
            const extension = this.getFileExtension(file.path);
            const newPath = generateNewDocumentPath(transformedTitle, extension, file.parent?.path);
            try {
                const copiedFile = await this.app.vault.copy(file, newPath);
                if (copiedFile instanceof TFile) {
                    await this.app.workspace.getLeaf().openFile(copiedFile);
                    new Notice("Duplicated note created: " + copiedFile.path);
                } else {
                    new Notice("Duplication failed: unable to create file.");
                }
            } catch(error) {
                new Notice(`Duplication failed due to ${error}`);
            }
        } else {
            new Notice(`Duplication failed: ${result.reason}`);
        }
    }

    private getFileExtension(filePath: string, defaultExtension: string = "md") {
        return this.app.vault.getFileByPath(filePath)?.extension || defaultExtension;
    }

    async loadSettings() {
        const loaded = (await this.loadData()) as Partial<SquireSettings> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
    }

    private loadingModel = false;

    private setStatus(text: string): void {
        this.statusBarItem.textContent = text;
        this.statusBarItem.removeClass('squire-status-hidden');
    }

    private clearStatus(): void {
        this.statusBarItem.addClass('squire-status-hidden');
    }

    private async reinitSemanticService(onProgress?: (pct: number) => void): Promise<void> {
        if (this.loadingModel) return;
        this.loadingModel = true;
        try {
            this.currentModelId = this.settings.semanticModelId;

            if (!this.settings.semanticModelId) {
                const svc = new NullSemanticService();
                this.relatedNotesService.setSemanticService(svc);
                this.relatedNotesService.algorithmLabel = this.algorithmLabel();
                this.refreshRelatedNotesViews();
                return;
            }

            this.setStatus("Loading model…");
            new Notice("Switching model…");

            const svc = await this.initSemanticService(onProgress);

            this.setStatus("Indexing notes…");
            new Notice("Model loaded; indexing notes…");

            this.relatedNotesService.setSemanticService(svc);
            this.relatedNotesService.algorithmLabel = this.algorithmLabel();
            this.refreshRelatedNotesViews();

            new Notice("Model ready");
        } finally {
            this.loadingModel = false;
            this.clearStatus();
        }
    }

    async clearModelCache(): Promise<void> {
        if (!this.manifest.dir) return;
        const cache = new DiskCache(this.app.vault.adapter, this.manifest.dir);
        await cache.clearAll();
        new Notice("Model cache cleared.");
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.registerTransformers();

        if (this.currentModelId !== this.settings.semanticModelId) {
            void this.reinitSemanticService().catch(e => {
                new Notice(`Model loading failed: ${e instanceof Error ? e.message : String(e)}`);
            });
        }
    }
}