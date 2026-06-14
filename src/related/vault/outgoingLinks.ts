import { App, TFile } from "obsidian";
import { normaliseLinkPath } from "../vaultUtils";

export function outgoingLinks(app: App, file: TFile): Set<string> {
    const links = new Set<string>();
    const resolved = app.metadataCache.resolvedLinks[file.path];
    if (resolved) {
        for (const targetPath of Object.keys(resolved)) {
            links.add(normaliseLinkPath(targetPath));
        }
    }
    return links;
}
