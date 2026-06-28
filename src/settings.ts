import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type SquirePlugin from './plugin';
import type { SquireSettings } from './types';
import { containsUnsafeFileNameCharacters, MAX_SEPARATOR_LENGTH, UNSAFE_FILE_NAME_CHARACTERS } from './fileUtils';
import { DEFAULT_WEIGHTS } from './related';
import { DEFAULT_RESULT_LIMIT, normalizeResultLimit, normalizeWeight } from './related/settingsUtils';
import { MODELS } from './related/semantic/models';

export const DEFAULT_SETTINGS: SquireSettings = {
    indexSeparator: '-',
    relatedNotesLimit: 5,
    weightWords: 1,
    weightTags: 0.5,
    weightLinks: 0.5,
    showRelatedNotesSidebar: true,
    semanticModelId: '',
};

export class SquireSettingsTab extends PluginSettingTab {
    plugin: SquirePlugin;

    constructor(app: App, plugin: SquirePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    private addWeightSetting(containerEl: HTMLElement, name: string, desc: string, fallback: number, getValue: () => number, setValue: (v: number) => void): void {
        new Setting(containerEl)
            .setName(name)
            .setDesc(`${desc} (default: ${fallback})`)
            .addText(text => text
                .setPlaceholder(String(fallback))
                .setValue(String(getValue()))
                .onChange(async (value) => {
                    setValue(normalizeWeight(value, fallback));
                    await this.plugin.saveSettings();
                }));
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl).setName("Index numbering").setHeading();

        new Setting(containerEl)
            .setName("Index separator")
            .setDesc(`Enter the character which separates your identification system and your actual title. (E.g. in '1.1 - Note Title', the index separator is '-') 
                \nObsidian does not allow characters like ${UNSAFE_FILE_NAME_CHARACTERS.join(", ")} in file names.
                \nThe index separator cannot be longer than ${MAX_SEPARATOR_LENGTH} characters.`)
            .addText(text => text
                .setPlaceholder('-')
                .setValue(this.plugin.settings.indexSeparator)
                .onChange(async (value) => {
                    if (containsUnsafeFileNameCharacters(value)) {
                        new Notice(`The index separator cannot contain any of the following characters: ${UNSAFE_FILE_NAME_CHARACTERS.join(", ")}. Defaulting to ${DEFAULT_SETTINGS.indexSeparator}`);
                        this.plugin.settings.indexSeparator = DEFAULT_SETTINGS.indexSeparator;
                    } else if (value.length > MAX_SEPARATOR_LENGTH) {
                        new Notice(`The index separator cannot be longer than ${MAX_SEPARATOR_LENGTH} characters. Defaulting to ${DEFAULT_SETTINGS.indexSeparator}`);
                        this.plugin.settings.indexSeparator = DEFAULT_SETTINGS.indexSeparator;
                    } else {
                        this.plugin.settings.indexSeparator = value;
                    }
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl).setName("Related notes").setHeading();

        new Setting(containerEl)
            .setName("Number of suggestions")
            .setDesc("How many related notes to show (1-50).")
            .addText(text => text
                .setPlaceholder(String(DEFAULT_RESULT_LIMIT))
                .setValue(String(this.plugin.settings.relatedNotesLimit))
                .onChange(async (value) => {
                    this.plugin.settings.relatedNotesLimit = normalizeResultLimit(value);
                    await this.plugin.saveSettings();
                }));

        this.addWeightSetting(containerEl, "Word match weight", "How strongly word similarity affects results. Higher values favour notes with similar vocabulary.", DEFAULT_WEIGHTS.words, () => this.plugin.settings.weightWords, v => this.plugin.settings.weightWords = v);
        this.addWeightSetting(containerEl, "Tag match weight", "How strongly shared tags affect results. Higher values favour notes with the same topic labels.", DEFAULT_WEIGHTS.tags, () => this.plugin.settings.weightTags, v => this.plugin.settings.weightTags = v);
        this.addWeightSetting(containerEl, "Link match weight", "How strongly shared outgoing links affect results. Higher values favour notes linking to the same pages.", DEFAULT_WEIGHTS.links, () => this.plugin.settings.weightLinks, v => this.plugin.settings.weightLinks = v);

        new Setting(containerEl).setName("Similarity scoring").setHeading();

        new Setting(containerEl)
            .setName("Scorer")
            .setDesc("Use TF-IDF for lexical scoring only, or select a model for hybrid TF-IDF + semantic embedding scoring.")
            .addDropdown(dropdown => {
                dropdown.addOption('', 'TF-IDF (lexical only)');
                for (const model of Object.values(MODELS)) {
                    dropdown.addOption(model.id, model.label);
                }
                dropdown.setValue(this.plugin.settings.semanticModelId)
                .onChange(async (value) => {
                    this.plugin.settings.semanticModelId = value;
                    await this.plugin.saveSettings();
                });
            })

        new Setting(containerEl)
            .setName("Clear model cache")
            .setDesc("Delete downloaded model files to free up disk space.")
            .addButton(button => button
                .setButtonText("Clear cache")
                .onClick(async () => {
                    await this.plugin.clearModelCache();
                }));
    }

}