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
import type { SemanticService, VaultFileReader, VaultEventSource } from './related/semantic';
import {
    FixedEmbeddingEngine,
    EmbeddingIndex,
    DefaultSemanticService,
    NullSemanticService,
} from './related/semantic';

let transformerMenuRef: EventRef | null = null;

export default class SquirePlugin extends Plugin {
    settings: SquireSettings;
    private registeredEvents: Array<() => void> = [];
    relatedNotesService: RelatedNotesService;

    onunload() {
        this.registeredEvents.forEach(unregister => unregister());
        this.removeCommand('show-related-notes');
        this.removeCommand('toggle-related-notes-view');
    }

    async onload() {
        await this.loadSettings();

        const semanticService = this.initSemanticService();
        this.relatedNotesService = new RelatedNotesService(
            this.app,
            () => this.settings,
            buildNoteDoc,
            collectCandidates,
            semanticService
        );

        this.addSettingTab(new SquireSettingsTab(this.app, this));
        this.registerTransformers();
        this.registerRelatedNotes();
        if (this.settings.showRelatedNotesSidebar) {
            void this.openRelatedNotesLeaf();
        }
    }

    private initSemanticService(): SemanticService {
        const index = new EmbeddingIndex(this.app.vault.adapter);
        const engine = new FixedEmbeddingEngine();
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
            (evt) => this.registerEvent(evt as any),
            (msg) => new Notice(msg)
        );
        void svc.init(this.settings.semanticModelId);
        return this.settings.weightSemantic > 0 ? svc : new NullSemanticService();
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
        if (transformerMenuRef) {
            this.app.workspace.offref(transformerMenuRef);
            transformerMenuRef = null;
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
        transformerMenuRef = ref;

        this.registeredEvents.forEach(unregister => unregister());
        this.registeredEvents = [];
        for (const configItem of config) {
            const command = this.addCommand({
                id: configItem.id,
                name: configItem.title,
                callback: async () => {
                    const file = this.app.workspace.getActiveFile();
                    if (!file) {
                        new Notice('No active file to run command on.');
                        return;
                    }
                    await this.duplicateWithTransform(file, new configItem.transformer(this.settings.indexSeparator).transform);
                }
            });
            this.registeredEvents.push(() => this.removeCommand(command.id));
        }
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

    async saveSettings() {
        await this.saveData(this.settings);
        this.registerTransformers();
    }
}