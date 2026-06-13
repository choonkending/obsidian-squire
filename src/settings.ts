import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type ObsidianNoteDuplicatorPlugin from './plugin';
import type { ObsidianNoteDuplicatorSettings } from './types';
import { containsUnsafeFileNameCharacters, MAX_SEPARATOR_LENGTH, UNSAFE_FILE_NAME_CHARACTERS } from './fileUtils';
import { DEFAULT_WEIGHTS } from './related';
import { DEFAULT_RESULT_LIMIT, normalizeResultLimit, normalizeWeight } from './related/settingsUtils';

export const DEFAULT_SETTINGS: ObsidianNoteDuplicatorSettings = {
    regexSetting: '/.*/gm',
    indexSeparator: '-',
    relatedNotesLimit: 5,
    weightWords: 1,
    weightTags: 0.5,
    weightLinks: 0.5,
};

export class ObsidianNoteDuplicatorSettingsTab extends PluginSettingTab {
    plugin: ObsidianNoteDuplicatorPlugin;

    constructor(app: App, plugin: ObsidianNoteDuplicatorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl).setName("Title").setHeading();

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

        new Setting(containerEl)
            .setName("Word match weight")
            .setDesc("Weight for title/body word overlap (0 = disabled).")
            .addText(text => text
                .setPlaceholder(String(DEFAULT_WEIGHTS.words))
                .setValue(String(this.plugin.settings.weightWords))
                .onChange(async (value) => {
                    this.plugin.settings.weightWords = normalizeWeight(value, DEFAULT_WEIGHTS.words);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Tag match weight")
            .setDesc("Weight for shared tags (0 = disabled).")
            .addText(text => text
                .setPlaceholder(String(DEFAULT_WEIGHTS.tags))
                .setValue(String(this.plugin.settings.weightTags))
                .onChange(async (value) => {
                    this.plugin.settings.weightTags = normalizeWeight(value, DEFAULT_WEIGHTS.tags);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Link match weight")
            .setDesc("Weight for shared outgoing links (0 = disabled).")
            .addText(text => text
                .setPlaceholder(String(DEFAULT_WEIGHTS.links))
                .setValue(String(this.plugin.settings.weightLinks))
                .onChange(async (value) => {
                    this.plugin.settings.weightLinks = normalizeWeight(value, DEFAULT_WEIGHTS.links);
                    await this.plugin.saveSettings();
                }));
    }

}