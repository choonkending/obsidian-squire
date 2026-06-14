export function normaliseTag(tag: string): string {
    return tag.replace(/^#/, "").toLowerCase();
}
