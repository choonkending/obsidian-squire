import { TitleTransformer, TransformResult } from "./types";
import { DEFAULT_INDEX_SEPARATOR } from "../fileUtils";
import { isNumericPrefix, extractPrefix, getLastSegments } from "../numberUtils";

export default class NestLastNumberTransformer implements TitleTransformer {
    indexSeparator: string;

    constructor(indexSeparator: string = DEFAULT_INDEX_SEPARATOR) {
        this.indexSeparator = indexSeparator;
    }

    transform = (title: string, siblingPrefixes: string[]): TransformResult  => {
        const prefix = extractPrefix(title, this.indexSeparator);
        if (prefix === null || !isNumericPrefix(prefix)) {
            return { status: 'FAILURE', reason: 'Invalid title format' };
        }

        const childPrefix = prefix + ".";
        const childSegments = getLastSegments(siblingPrefixes, childPrefix);
        const maxSegment = Math.max(0, ...childSegments);
        const newTitle = childPrefix + (maxSegment + 1) + ` ${this.indexSeparator} `;
        return { status: 'SUCCESS', transformedTitle: newTitle };
    }
}
