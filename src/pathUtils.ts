export function generateNewDocumentPath(title: string, extension: string, directoryPath: string = ""): string {
    const newFileName = `${title}.${extension}`;
    if (!directoryPath) {
        return newFileName;
    }

    return `${directoryPath}/${newFileName}`;
}
