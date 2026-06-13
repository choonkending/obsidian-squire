import { tokenize, termFrequencies } from "../text";

export function tokensWithTitleBoost(
    title: string,
    body: string,
    boost: number = 2
): Map<string, number> {
    const titleFrequencies = termFrequencies(tokenize(title));
    const bodyFrequencies = termFrequencies(tokenize(body));

    const result = new Map(bodyFrequencies);
    for (const [token, count] of titleFrequencies) {
        result.set(token, (result.get(token) ?? 0) + count * boost);
    }
    return result;
}
