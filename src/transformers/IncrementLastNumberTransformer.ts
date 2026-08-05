import { TitleTransformer, TransformResult } from "./types";
import { DEFAULT_INDEX_SEPARATOR } from "../fileUtils";
import { isNumericPrefix, extractPrefix, getLastSegments } from "../numberUtils";

export default class IncrementLastNumberTransformer implements TitleTransformer {
    indexSeparator: string;

    constructor(indexSeparator: string = DEFAULT_INDEX_SEPARATOR) {
        this.indexSeparator = indexSeparator;
    }

    transform = (title: string, siblingPrefixes: Array<string>): TransformResult  => {
        const prefix = extractPrefix(title, this.indexSeparator);
        if (prefix === null || !isNumericPrefix(prefix)) {
            return { status: 'FAILURE', reason: 'Invalid title format' };
        }

        const lastDotIndex = prefix.lastIndexOf(".");
        const parentPrefix = lastDotIndex > -1 ? prefix.slice(0, lastDotIndex + 1) : "";
        const currentSegment = parseInt(lastDotIndex > -1 ? prefix.slice(lastDotIndex + 1) : prefix);

        const siblingSegments = getLastSegments(siblingPrefixes, parentPrefix);
        const maxSegment = Math.max(currentSegment, ...siblingSegments);
        const newTitle = parentPrefix + (maxSegment + 1) + ` ${this.indexSeparator} `;
        return { status: 'SUCCESS', transformedTitle: newTitle };
    }
}
