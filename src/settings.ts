import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type ObsidianNoteDuplicatorPlugin from './plugin';
import type { ObsidianNoteDuplicatorSettings } from './types';
import { containsUnsafeFileNameCharacters, MAX_SEPARATOR_LENGTH, UNSAFE_FILE_NAME_CHARACTERS } from './fileUtils';

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
    }

}