import type { SemanticService } from "./SemanticService";

export class NullSemanticService implements SemanticService {
    async init(_modelId: string): Promise<void> {}
    async score(_queryText: string): Promise<Map<string, number> | null> { return null; }
}
