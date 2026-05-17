import { generateNewDocumentPath } from "../pathUtils";

describe("pathUtils", () => {
    describe("generateNewDocumentPath", () => {
        const testCases: Array<{
            input: [string, string] | [string, string, string];
            output: string;
        }> = [
            {
                input: ["Test Note", "md"],
                output: "Test Note.md"
            },
            {
                input: ["Test Note", "md", "folder/subfolder"],
                output: "folder/subfolder/Test Note.md"
            },
            {
                input: ["Test Note", "md", "folder/subfolder/"],
                output: "folder/subfolder/Test Note.md"
            },
            {
                input: ["Test Note", "md", "folder\\subfolder"],
                output: "folder/subfolder/Test Note.md"
            },
            {
                input: ["Test Note", "md", "folder//subfolder"],
                output: "folder/subfolder/Test Note.md"
            }
        ];

        testCases.forEach(testCase => {
            it(`given ${JSON.stringify(testCase.input)} should return ${testCase.output}`, () => {
                const result = testCase.input.length === 2
                    ? generateNewDocumentPath(testCase.input[0], testCase.input[1])
                    : generateNewDocumentPath(testCase.input[0], testCase.input[1], testCase.input[2]);
                expect(result).toBe(testCase.output);
            });
        });
    });
});

// this is necessary to conform the isolatedModules compiler option and can be removed as soon as an import is added
export {};
