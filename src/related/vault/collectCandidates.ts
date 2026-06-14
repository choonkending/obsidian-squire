import { App, TFile } from "obsidian";
import type { NoteDoc } from "../types";
import { buildNoteDoc } from "./buildNoteDoc";

export async function collectCandidates(
    app: App,
    exclude?: TFile
): Promise<NoteDoc[]> {
    const files = app.vault
        .getMarkdownFiles()
        .filter(file => file.path !== exclude?.path);

    return Promise.all(files.map(file => buildNoteDoc(app, file)));
}
