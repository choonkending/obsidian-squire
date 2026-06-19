import { IncrementLastNumberTransformer } from '../index';

describe("IncrementLastNumberTransformer Spec", () => {
    const transformer = new IncrementLastNumberTransformer();

    describe("transform", () => {
        [
            {
                "input": "1 - Example MOC",
                "output": {
                    "status": "SUCCESS",
                    "transformedTitle": "2 - "
                }
            },
            {
                "input": "1.1 - Example MOC",
                "output": {
                    "status": "SUCCESS",
                    "transformedTitle": "1.2 - "
                }
            },
            {
                "input": "Example MOC",
                "output": {
                    "status": "FAILURE",
                    "reason": "Invalid title format"
                }
            }
        ].forEach(testCase => {
            it(`given ${testCase.input} should return status ${testCase.output.status}`, () => {
                const transformerResult = transformer.transform(testCase.input, []);
                expect(transformerResult.status).toBe(testCase.output.status);
                if (transformerResult.status === 'SUCCESS') {
                    expect(transformerResult.transformedTitle).toBe(testCase.output.transformedTitle);
                } else {
                    expect(transformerResult.reason).toBe(testCase.output.reason);
                }
            });
        });
    });

});

// this is necessary to conform the isolatedModules compiler option and can be removed as soon as an import is added
export {};