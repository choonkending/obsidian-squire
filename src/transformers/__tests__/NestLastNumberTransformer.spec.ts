import { NestLastNumberTransformer } from '../index';

describe("NestLastNumberTransformer Spec", () => {
    const transformer = new NestLastNumberTransformer();

    describe("transform", () => {
        [
            {
                "input": "1 - Example MOC",
                "siblings": [],
                "output": {
                    "status": "SUCCESS",
                    "transformedTitle": "1.1 - "
                }
            },
            {
                "input": "1.1 - Example MOC",
                "siblings": [],
                "output": {
                    "status": "SUCCESS",
                    "transformedTitle": "1.1.1 - "
                }
            },
            {
                "input": "Example MOC",
                "siblings": [],
                "output": {
                    "status": "FAILURE",
                    "reason": "Invalid title format"
                }
            },
            {
                "input": "1 - Example MOC",
                "siblings": ["1.1"],
                "output": {
                    "status": "SUCCESS",
                    "transformedTitle": "1.2 - "
                }
            },
            {
                "input": "1.1 - Example MOC",
                "siblings": ["1.1.1"],
                "output": {
                    "status": "SUCCESS",
                    "transformedTitle": "1.1.2 - "
                }
            },
            {
                "input": "1 - Example MOC",
                "siblings": ["1.1", "1.2"],
                "output": {
                    "status": "SUCCESS",
                    "transformedTitle": "1.3 - "
                }
            },
            {
                "input": "1 - Example MOC",
                "siblings": ["1.1", "1.1.1"],
                "output": {
                    "status": "SUCCESS",
                    "transformedTitle": "1.2 - "
                }
            },
            {
                "input": "MOC - Example",
                "siblings": [],
                "output": {
                    "status": "FAILURE",
                    "reason": "Invalid title format"
                }
            },
            {
                "input": "1.1 - Example MOC",
                "siblings": ["1.1.1", "1.1.2"],
                "output": {
                    "status": "SUCCESS",
                    "transformedTitle": "1.1.3 - "
                }
            }
        ].forEach(testCase => {
            it(`given ${testCase.input} with siblings [${testCase.siblings}] should return status ${testCase.output.status}`, () => {
                const transformerResult = transformer.transform(testCase.input, testCase.siblings);
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
