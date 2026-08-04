export interface VaultFileReader {
    getMarkdownFiles(): ReadonlyArray<{ path: string; extension: string }>;
    readFile(path: string): Promise<string>;
}

export interface VaultEventSource {
    on(event: "modify" | "create", handler: (file: { path: string }) => void): unknown;
    on(event: "delete", handler: (file: { path: string }) => void): unknown;
}
