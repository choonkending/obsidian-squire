import {
    normalizeResultLimit,
    normalizeWeight,
    MIN_RESULT_LIMIT,
    MAX_RESULT_LIMIT,
} from "../settingsUtils";

describe("settingsUtils", () => {
    describe("normalizeResultLimit", () => {
        const testCases: Array<{ input: string; output: number }> = [
            { input: "5", output: 5 },
            { input: "0", output: MIN_RESULT_LIMIT },
            { input: "-3", output: MIN_RESULT_LIMIT },
            { input: "999", output: MAX_RESULT_LIMIT },
            { input: "abc", output: 5 },
            { input: "", output: 5 },
            { input: "7.9", output: 7 },
        ];

        testCases.forEach(testCase => {
            it(`given ${JSON.stringify(testCase.input)} returns ${testCase.output}`, () => {
                expect(normalizeResultLimit(testCase.input)).toBe(testCase.output);
            });
        });

        it("uses the provided fallback for invalid input", () => {
            expect(normalizeResultLimit("xyz", 10)).toBe(10);
        });
    });

    describe("normalizeWeight", () => {
        const testCases: Array<{ input: string; fallback: number; output: number }> = [
            { input: "1.0", fallback: 1, output: 1 },
            { input: "0", fallback: 1, output: 0 },
            { input: "0.5", fallback: 1, output: 0.5 },
            { input: "-2", fallback: 1, output: 1 },
            { input: "abc", fallback: 0.5, output: 0.5 },
            { input: "", fallback: 0.5, output: 0.5 },
        ];

        testCases.forEach(testCase => {
            it(`given ${JSON.stringify(testCase.input)} (fallback ${testCase.fallback}) returns ${testCase.output}`, () => {
                expect(normalizeWeight(testCase.input, testCase.fallback)).toBe(testCase.output);
            });
        });
    });
});
