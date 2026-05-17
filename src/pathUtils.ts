export function generateNewDocumentPath(title: string, extension: string, directoryPath: string = ""): string {
    const newFileName = `${title}.${extension}`;
    if (!directoryPath) {
        return newFileName;
    }

    const normalizedDirectoryPath = directoryPath
        .replace(/\\/g, "/")              // Convert backslashes to forward slashes
        .replace(/\/+/g, "/")             // Collapse multiple slashes into one
        .replace(/\/$/, "");              // Remove trailing slash

    return `${normalizedDirectoryPath}/${newFileName}`;
}
