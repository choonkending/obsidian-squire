import { Notice, Plugin, TAbstractFile, TFile } from 'obsidian';
import config from './config';
import type { ObsidianNoteDuplicatorSettings } from './types';
import type { TransformResult } from './transformers';
import { ObsidianNoteDuplicatorSettingsTab, DEFAULT_SETTINGS } from './settings';
import { generateNewDocumentPath } from './pathUtils';

export default class ObsidianNoteDuplicatorPlugin extends Plugin {
    settings: ObsidianNoteDuplicatorSettings;
    private registeredEvents: Array<() => void> = [];

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new ObsidianNoteDuplicatorSettingsTab(this.app, this));
        this.registerTransformers();
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
        const loaded = (await this.loadData()) as Partial<ObsidianNoteDuplicatorSettings> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.registerTransformers();
    }
}