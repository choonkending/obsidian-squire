import {
    tokensWithTitleBoost,
    normaliseLinkPath,
    normaliseTag,
} from "../vaultUtils/index";

describe("vaultUtils", () => {
    describe("tokensWithTitleBoost", () => {
        it("doubles title token weight relative to body tokens", () => {
            const result = tokensWithTitleBoost("learning", "learning");
            expect(result.get("learning")).toBe(3);
        });

        it("returns only title tokens when body is empty", () => {
            const result = tokensWithTitleBoost("neural networks", "");
            expect(result.get("neural")).toBe(2);
            expect(result.get("networks")).toBe(2);
        });

        it("returns only body tokens when title is empty", () => {
            const result = tokensWithTitleBoost("", "deep learning");
            expect(result.get("deep")).toBe(1);
            expect(result.get("learning")).toBe(1);
        });

        it("filters stop words from both title and body", () => {
            const result = tokensWithTitleBoost("the cat", "is the dog");
            expect(result.has("the")).toBe(false);
            expect(result.has("is")).toBe(false);
            expect(result.get("cat")).toBe(2);
            expect(result.get("dog")).toBe(1);
        });

        it("returns empty map for empty inputs", () => {
            const result = tokensWithTitleBoost("", "");
            expect(result.size).toBe(0);
        });

        it("accepts a custom boost value", () => {
            const result = tokensWithTitleBoost("learning", "learning", 3);
            expect(result.get("learning")).toBe(4);
        });

        it("handles float boost values", () => {
            const result = tokensWithTitleBoost("alpha", "alpha beta", 1.5);
            expect(result.get("alpha")).toBeCloseTo(2.5, 5);
            expect(result.get("beta")).toBe(1);
        });
    });

    describe("normaliseLinkPath", () => {
        const testCases: Array<{ input: string; expected: string }> = [
            { input: "folder/note.md", expected: "note" },
            { input: "note.md", expected: "note" },
            { input: "NOTE.MD", expected: "note" },
            { input: "a/b/c/deep.md", expected: "deep" },
            { input: "no-extension", expected: "no-extension" },
            { input: "Mixed/Case.File.MD", expected: "case.file" },
        ];

        testCases.forEach(({ input, expected }) => {
            it(`"${input}" → "${expected}"`, () => {
                expect(normaliseLinkPath(input)).toBe(expected);
            });
        });
    });

    describe("normaliseTag", () => {
        const testCases: Array<{ input: string; expected: string }> = [
            { input: "#ai", expected: "ai" },
            { input: "#MachineLearning", expected: "machinelearning" },
            { input: "already-clean", expected: "already-clean" },
            { input: "#UPPER", expected: "upper" },
        ];

        testCases.forEach(({ input, expected }) => {
            it(`"${input}" → "${expected}"`, () => {
                expect(normaliseTag(input)).toBe(expected);
            });
        });
    });
});
