export function normaliseLinkPath(targetPath: string): string {
    const base = targetPath.split("/").pop() ?? targetPath;
    return base.replace(/\.md$/i, "").toLowerCase();
}
