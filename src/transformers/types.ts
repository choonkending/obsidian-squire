type TransformSuccess = {
    status: 'SUCCESS';
    transformedTitle: string;
}

type TransformFailure = {
    status: 'FAILURE';
    reason: string;
}

export type TransformResult = TransformSuccess | TransformFailure;

export interface TitleTransformer {
    transform(title: string, siblingPrefixes: Array<string>): TransformResult
}