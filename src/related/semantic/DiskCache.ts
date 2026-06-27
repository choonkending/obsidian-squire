import type { DataAdapter } from "obsidian";

export class DiskCache {
  constructor(
    private readonly adapter: DataAdapter,
    private readonly basePath: string
  ) {}

  private getCacheDir(): string {
    return `${this.basePath}/.cache/transformers`;
  }

  private sanitizeKey(key: string): string {
    return key.replace(/:\/\//g, "_").replace(/\//g, "_");
  }

  private getFilePath(key: string): string {
    return `${this.getCacheDir()}/${this.sanitizeKey(key)}`;
  }

  async match(request: string): Promise<Response | undefined> {
    const filePath = this.getFilePath(request);
    try {
      const buffer = await this.adapter.readBinary(filePath);
      return new Response(new Uint8Array(buffer));
    } catch {
      return undefined;
    }
  }

  async put(request: string, response: Response): Promise<void> {
    const filePath = this.getFilePath(request);
    await this.adapter.mkdir(this.getCacheDir()).catch(() => {});
    const arrayBuffer = await response.arrayBuffer();
    await this.adapter.writeBinary(filePath, arrayBuffer);
  }

  private fileName(filePath: string): string {
    return filePath.split("/").pop() ?? filePath;
  }

  async isCached(modelId: string): Promise<boolean> {
    try {
      const entries = await this.adapter.list(this.getCacheDir());
      const key = this.sanitizeKey(modelId);
      return entries.files.some(f => this.fileName(f).includes(key));
    } catch {
      return false;
    }
  }

  async clearStale(activeModelIds: string[]): Promise<number> {
    try {
      const entries = await this.adapter.list(this.getCacheDir());
      const sanitized = activeModelIds.map(id => this.sanitizeKey(id));
      let deleted = 0;
      for (const filePath of entries.files) {
        const name = this.fileName(filePath);
        if (!sanitized.some(key => name.includes(key))) {
          await this.adapter.remove(filePath);
          console.log(`[DiskCache] removed stale cache file: ${name}`);
          deleted++;
        }
      }
      if (deleted > 0) {
        console.log(`[DiskCache] cleared ${deleted} stale file(s) from cache`);
      }
      return deleted;
    } catch {
      return 0;
    }
  }

  async clearAll(): Promise<void> {
    try {
      const entries = await this.adapter.list(this.getCacheDir());
      for (const filePath of entries.files) {
        await this.adapter.remove(filePath);
      }
    } catch {}
  }

}
