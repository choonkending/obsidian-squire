import { TitleTransformer, TransformResult } from "./types";
import { DEFAULT_INDEX_SEPARATOR } from "../fileUtils";

export default class NestLastNumberTransformer implements TitleTransformer {
    indexSeparator: string;

    constructor(indexSeparator: string = DEFAULT_INDEX_SEPARATOR) {
        this.indexSeparator = indexSeparator;
    }

    transform = (title: string, siblingPrefixes: string[]): TransformResult  => {
        const result = title.split(this.indexSeparator);
        if (result.length > 1) {
            const prefix = result[0].trim();

            if (!/^\d+(\.\d+)*$/.test(prefix)) {
                return { status: 'FAILURE', reason: 'Invalid title format' };
            }

            const childPrefix = prefix + ".";
            const childSegments = siblingPrefixes
                .filter(s => {
                    if (!s.startsWith(childPrefix)) return false;
                    const remaining = s.slice(childPrefix.length);
                    return remaining !== "" && !remaining.includes(".") && !isNaN(parseInt(remaining));
                })
                .map(s => parseInt(s.slice(childPrefix.length)));

            const maxSegment = Math.max(0, ...childSegments);
            const newTitle = childPrefix + (maxSegment + 1) + ` ${this.indexSeparator} `;
            return { status: 'SUCCESS', transformedTitle: newTitle };
        }
        return { status: 'FAILURE', reason: 'Invalid title format' };
    }
}
