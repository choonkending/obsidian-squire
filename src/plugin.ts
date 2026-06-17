import { Notice, Plugin, TAbstractFile, TFile, debounce } from 'obsidian';
import config from './config';
import type { SquireSettings } from './types';
import type { TransformResult } from './transformers';
import { SquireSettingsTab, DEFAULT_SETTINGS } from './settings';
import { generateNewDocumentPath } from './pathUtils';
import {
    RelatedNotesService,
    RelatedNotesModal,
    RelatedNotesView,
    RELATED_NOTES_VIEW_TYPE,
    buildNoteDoc,
    collectCandidates,
} from './related';

export default class SquirePlugin extends Plugin {
    settings: SquireSettings;
    private registeredEvents: Array<() => void> = [];
    relatedNotesService: RelatedNotesService;

    async onload() {
        await this.loadSettings();
        this.relatedNotesService = new RelatedNotesService(this.app, () => this.settings, buildNoteDoc, collectCandidates);
        this.addSettingTab(new SquireSettingsTab(this.app, this));
        this.registerTransformers();
        this.registerRelatedNotes();
        if (this.settings.showRelatedNotesSidebar) {
            void this.openRelatedNotesLeaf();
        }
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
        this.registeredEvents.forEach(unregister => unregister());
        this.registeredEvents = [];

        config.forEach(configItem => {
            const transformer = new configItem.transformer(this.settings.indexSeparator);
            const registerMenuRef = this.app.workspace.on('file-menu', (menu, file) => 
                    menu.addItem(item => 
                        item
                            .setTitle(configItem.title)
                            .setIcon('document')
                            .onClick(async () => await this.duplicateWithTransform(file, transformer.transform))
                    )
                );
            this.registerEvent(registerMenuRef);

            this.registeredEvents.push(() => this.app.workspace.offref(registerMenuRef));

            const command = this.addCommand({
                id: configItem.id,
                name: configItem.title,
                callback: async () => {
                    const file = this.app.workspace.getActiveFile();
                    if (!file) {
                        new Notice('No active file to run command on.');
                        return;
                    }
                    await this.duplicateWithTransform(file, transformer.transform);
                }
            });

            this.registeredEvents.push(() => this.removeCommand(command.id));
        });
    }

    private async duplicateWithTransform(file: TAbstractFile, transform: (title: string) => TransformResult) {
        const result = transform(file.name);

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