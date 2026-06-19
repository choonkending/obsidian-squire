import { containsUnsafeFileNameCharacters } from "../fileUtils";

describe("fileUtils", () => {
    describe("containsUnsafeFileNameCharacters", () => {
        [
            {
                "input": "ValidFileName",
                "output": false
            },
            {
                "input": "Invalid/FileName",
                "output": true
            },
            {
                "input": "Another\\Invalid:Name",
                "output": true
            },
            {
                "input": "Safe-Name_123",
                "output": false
            },
            {
                "input": "NameWith*Star?",
                "output": true
            }
        ].forEach(testCase => {
            it(`given ${testCase.input} should return ${testCase.output}`, () => {
                expect(containsUnsafeFileNameCharacters(testCase.input)).toBe(testCase.output);
            });
        });

    });
});