import { App, TFile } from "obsidian";
import type { NoteDoc } from "../types";
import { tokensWithTitleBoost } from "../vaultUtils";
import { outgoingLinks } from "./outgoingLinks";
import { noteTags } from "./noteTags";

export async function buildNoteDoc(app: App, file: TFile): Promise<NoteDoc> {
    const body = await app.vault.cachedRead(file);
    return {
        path: file.path,
        title: file.basename,
        tokens: tokensWithTitleBoost(file.basename, body),
        tags: noteTags(app, file),
        links: outgoingLinks(app, file),
    };
}
