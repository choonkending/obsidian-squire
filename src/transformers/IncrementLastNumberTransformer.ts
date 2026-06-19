import { TitleTransformer, TransformResult } from "./types";
import { DEFAULT_INDEX_SEPARATOR } from "../fileUtils";

export default class IncrementLastNumberTransformer implements TitleTransformer {
    indexSeparator: string;

    constructor(indexSeparator: string = DEFAULT_INDEX_SEPARATOR) {
        this.indexSeparator = indexSeparator;
    }

    transform = (title: string, _siblingPrefixes: string[]): TransformResult  => {
        const result = title.split(this.indexSeparator);
        if (result.length > 1) {
            const prefix = result[0];
            const lastDecimalPosition = prefix.lastIndexOf(".")
            if (lastDecimalPosition > -1) {
                const lastNumber = parseInt(prefix.slice(lastDecimalPosition + 1));
                const incrementedLastNumber =  lastNumber + 1;
                const newTitle = prefix.slice(0, lastDecimalPosition + 1) + incrementedLastNumber + ` ${this.indexSeparator} `;
                return { status: 'SUCCESS', transformedTitle: newTitle };
            } else {
                const lastNumber = parseInt(prefix);
                const incrementedLastNumber = lastNumber + 1;
                const newTitle = incrementedLastNumber + ` ${this.indexSeparator} `;
                return { status: 'SUCCESS', transformedTitle: newTitle };
            }
        } 
        return { status: 'FAILURE', reason: 'Invalid title format' };
    }
}