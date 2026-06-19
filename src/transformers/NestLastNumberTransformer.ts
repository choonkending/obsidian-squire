import { TitleTransformer, TransformResult } from "./types";
import { DEFAULT_INDEX_SEPARATOR } from "../fileUtils";

export default class NestLastNumberTransformer implements TitleTransformer {
    indexSeparator: string;

    constructor(indexSeparator: string = DEFAULT_INDEX_SEPARATOR) {
        this.indexSeparator = indexSeparator;
    }

    transform = (title: string, _siblingPrefixes: string[]): TransformResult  => {
        const result = title.split(this.indexSeparator);
        if (result.length > 1) {
            const prefix = result[0];
            const newTitle = prefix.trim() + ".1" + ` ${this.indexSeparator} `;
            return { status: 'SUCCESS', transformedTitle: newTitle };
        }
        return { status: 'FAILURE', reason: 'Invalid title format' };
    }
}