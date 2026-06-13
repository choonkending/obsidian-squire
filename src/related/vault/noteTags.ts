import { App, TFile, getAllTags } from "obsidian";
import { normaliseTag } from "../vaultUtils";

export function noteTags(app: App, file: TFile): Set<string> {
    const cache = app.metadataCache.getFileCache(file);
    const tags = new Set<string>();
    if (cache) {
        const all = getAllTags(cache) ?? [];
        for (const tag of all) {
            tags.add(normaliseTag(tag));
        }
    }
    return tags;
}
