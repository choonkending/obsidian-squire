export interface SemanticService {
    init(modelId: string): Promise<void>;
    score(queryText: string): Promise<Map<string, number> | null>;
}
