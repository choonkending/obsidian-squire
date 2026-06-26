export interface NoteDoc {
    path: string;
    title: string;
    tokens: Map<string, number>;
    tags: Set<string>;
    links: Set<string>;
}

export interface RelatedResult {
    path: string;
    title: string;
    score: number;
}

export interface RelatedWeights {
    words: number;
    tags: number;
    links: number;
}
