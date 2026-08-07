import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import type { NoteDoc } from "../src/related/types";
import { tokensWithTitleBoost } from "../src/related/vaultUtils/tokensWithTitleBoost";
import { normaliseLinkPath } from "../src/related/vaultUtils/normaliseLinkPath";
import { normaliseTag } from "../src/related/vaultUtils/normaliseTag";

const MARKDOWN_EXTENSION = ".md";
const TAG_REGEX = /(?:^|\s)#([\p{L}\p{N}_/-]+)/gu;
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
const MARKDOWN_LINK_REGEX = /\[[^\]]*\]\(([^)\s]+)\)/g;

export interface CorpusNote {
    doc: NoteDoc;
    rawText: string;
}

function walkMarkdown(dir: string, out: Array<string>): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            walkMarkdown(full, out);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(MARKDOWN_EXTENSION)) {
            out.push(full);
        }
    }
}

function relPath(root: string, full: string): string {
    return relative(root, full).split("\\").join("/");
}

function extractTags(body: string): Set<string> {
    const tags = new Set<string>();
    for (const match of body.matchAll(TAG_REGEX)) {
        tags.add(normaliseTag(match[1]));
    }
    return tags;
}

function extractLinks(body: string): Set<string> {
    const links = new Set<string>();
    for (const match of body.matchAll(WIKI_LINK_REGEX)) {
        links.add(normaliseLinkPath(match[1]));
    }
    for (const match of body.matchAll(MARKDOWN_LINK_REGEX)) {
        const target = match[1];
        if (!/^[a-z]+:/i.test(target)) {
            links.add(normaliseLinkPath(target));
        }
    }
    return links;
}

export function buildCorpusNote(rawText: string, path: string): CorpusNote {
    const base = path.replace(/\.md$/i, "");
    const title = base.split("/").pop() ?? base;
    return {
        rawText,
        doc: {
            path,
            title,
            tokens: tokensWithTitleBoost(title, rawText),
            tags: extractTags(rawText),
            links: extractLinks(rawText),
        },
    };
}

export interface GroundTruth {
    queries: Record<string, Array<string>>;
}

export function loadGroundTruth(path: string): GroundTruth {
    return JSON.parse(readFileSync(path, "utf8")) as GroundTruth;
}

export function loadCorpus(root: string): Array<CorpusNote> {
    if (!statSync(root).isDirectory()) {
        throw new Error(`Golden vault directory not found: ${root}`);
    }
    const files: Array<string> = [];
    walkMarkdown(root, files);
    files.sort();

    return files.map(full => buildCorpusNote(readFileSync(full, "utf8"), relPath(root, full)));
}