import {
    tokenize,
    stripMarkdown,
    termFrequencies,
    cosineSimilarity,
    jaccardSimilarity,
} from "../text";

describe("textUtils", () => {
    describe("stripMarkdown", () => {
        const testCases: Array<{ input: string; contains: string[]; excludes: string[] }> = [
            {
                input: "# Heading\nSome text",
                contains: ["Heading", "Some text"],
                excludes: ["#"],
            },
            {
                input: "See [the docs](https://example.com) please",
                contains: ["the docs", "please"],
                excludes: ["https://example.com", "]("],
            },
            {
                input: "A [[Wiki Link]] here",
                contains: ["Wiki Link"],
                excludes: ["[[", "]]"],
            },
            {
                input: "Use `const x = 1` inline",
                contains: ["Use", "inline"],
                excludes: ["const x = 1"],
            },
        ];

        testCases.forEach(testCase => {
            it(`given ${JSON.stringify(testCase.input)} keeps text and removes syntax`, () => {
                const result = stripMarkdown(testCase.input);
                testCase.contains.forEach(c => expect(result).toContain(c));
                testCase.excludes.forEach(e => expect(result).not.toContain(e));
            });
        });
    });

    describe("tokenize", () => {
        const testCases: Array<{ input: string; output: string[] }> = [
            {
                input: "The quick brown fox",
                output: ["quick", "brown", "fox"],
            },
            {
                input: "Machine learning, and neural networks!",
                output: ["machine", "learning", "neural", "networks"],
            },
            {
                input: "",
                output: [],
            },
            {
                input: "a I is the of",
                output: [],
            },
            {
                input: "# Notes on TypeScript\nStrict mode is great",
                output: ["notes", "typescript", "strict", "mode", "great"],
            },
        ];

        testCases.forEach(testCase => {
            it(`given ${JSON.stringify(testCase.input)} returns ${JSON.stringify(testCase.output)}`, () => {
                expect(tokenize(testCase.input)).toEqual(testCase.output);
            });
        });
    });

    describe("termFrequencies", () => {
        const testCases: Array<{ input: string[]; output: Array<[string, number]> }> = [
            {
                input: ["a", "b", "a", "c", "a"],
                output: [["a", 3], ["b", 1], ["c", 1]],
            },
            {
                input: [],
                output: [],
            },
        ];

        testCases.forEach(testCase => {
            it(`given ${JSON.stringify(testCase.input)} returns expected frequencies`, () => {
                const result = termFrequencies(testCase.input);
                expect([...result.entries()].sort()).toEqual(testCase.output.sort());
            });
        });
    });

    describe("cosineSimilarity", () => {
        it("returns 1 for identical vectors", () => {
            const a = termFrequencies(["machine", "learning", "learning"]);
            const b = termFrequencies(["machine", "learning", "learning"]);
            expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
        });

        it("returns 0 for disjoint vectors", () => {
            const a = termFrequencies(["cat", "dog"]);
            const b = termFrequencies(["car", "plane"]);
            expect(cosineSimilarity(a, b)).toBe(0);
        });

        it("returns 0 when one vector is empty", () => {
            const a = termFrequencies(["cat"]);
            const b = termFrequencies([]);
            expect(cosineSimilarity(a, b)).toBe(0);
        });

        it("returns a value between 0 and 1 for partial overlap", () => {
            const a = termFrequencies(["machine", "learning", "models"]);
            const b = termFrequencies(["machine", "learning", "vision"]);
            const score = cosineSimilarity(a, b);
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThan(1);
        });
    });

    describe("jaccardSimilarity", () => {
        const testCases: Array<{ a: string[]; b: string[]; output: number }> = [
            { a: ["x", "y"], b: ["x", "y"], output: 1 },
            { a: ["x", "y"], b: ["a", "b"], output: 0 },
            { a: [], b: [], output: 0 },
            { a: ["x", "y", "z"], b: ["y", "z", "w"], output: 2 / 4 },
        ];

        testCases.forEach(testCase => {
            it(`given ${JSON.stringify(testCase.a)} and ${JSON.stringify(testCase.b)} returns ${testCase.output}`, () => {
                const result = jaccardSimilarity(new Set(testCase.a), new Set(testCase.b));
                expect(result).toBeCloseTo(testCase.output, 5);
            });
        });
    });
});
