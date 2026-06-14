const FENCED_CODE_BLOCK = /```[\s\S]*?```/g;
const INLINE_CODE = /`[^`]+`/g;
const WIKI_LINKS = /\[\[([^\]]+)\]\]/g;
const MARKDOWN_LINKS = /\[([^\]]+)\]\([^)]+\)/g;
const HEADERS = /^#{1,6}\s+/gm;
const EMPHASIS = /[_*]{1,3}([^_]+)[_*]{1,3}/g;

export function stripMarkdown(text: string): string {
    return text
        .replace(FENCED_CODE_BLOCK, "")
        .replace(INLINE_CODE, "")
        .replace(WIKI_LINKS, "$1")
        .replace(MARKDOWN_LINKS, "$1")
        .replace(HEADERS, "")
        .replace(EMPHASIS, "$1");
}
