import { TitleTransformer, TransformResult } from "./types";
import { DEFAULT_INDEX_SEPARATOR } from "../fileUtils";

export default class IncrementLastNumberTransformer implements TitleTransformer {
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

            const lastDotIndex = prefix.lastIndexOf(".");
            const parentPrefix = lastDotIndex > -1 ? prefix.slice(0, lastDotIndex + 1) : "";
            const currentSegment = parseInt(lastDotIndex > -1 ? prefix.slice(lastDotIndex + 1) : prefix);

            const siblingSegments = siblingPrefixes
                .filter(s => {
                    if (!/^\d+(\.\d+)*$/.test(s)) return false;
                    const remaining = s.slice(parentPrefix.length);
                    return remaining !== "" && !remaining.includes(".") && !isNaN(parseInt(remaining));
                })
                .map(s => parseInt(s.slice(parentPrefix.length)));

            const maxSegment = Math.max(currentSegment, ...siblingSegments);
            const newTitle = parentPrefix + (maxSegment + 1) + ` ${this.indexSeparator} `;
            return { status: 'SUCCESS', transformedTitle: newTitle };
        }
        return { status: 'FAILURE', reason: 'Invalid title format' };
    }
}
