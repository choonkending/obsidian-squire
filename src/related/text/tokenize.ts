import { stripMarkdown } from "./strip";

const NON_WORD_CHARS = /[^\p{L}\p{N}']+/u;
const LEADING_TRAILING_APOSTROPHE = /^'+|'+$/g;

const STOP_WORDS: ReadonlySet<string> = new Set([
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from",
    "has", "have", "he", "her", "his", "i", "if", "in", "into", "is", "it",
    "its", "of", "on", "or", "she", "so", "that", "the", "their", "them",
    "then", "there", "these", "they", "this", "to", "was", "were", "what",
    "when", "which", "who", "will", "with", "you", "your", "we", "our", "us",
    "do", "does", "did", "not", "no", "yes", "can", "could", "would", "should",
]);

const MIN_TOKEN_LENGTH = 2;

export function tokenize(text: string): Array<string> {
    if (!text) {
        return [];
    }

    const stripped = stripMarkdown(text).toLowerCase();

    return stripped
        .split(NON_WORD_CHARS)
        .map(token => token.replace(LEADING_TRAILING_APOSTROPHE, ""))
        .filter(token =>
            token.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(token)
        );
}
