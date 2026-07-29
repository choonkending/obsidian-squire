import {
    tokenize,
    stripMarkdown,
    termFrequencies,
    cosineSimilaritySparse,
    cosineSimilarityDense,
    jaccardSimilarity,
} from "../text";
import { computeInverseDocumentFrequencies, applyInverseDocumentFrequency } from "../text/inverseDocumentFrequency";

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

    describe("cosineSimilaritySparse", () => {
        it("returns 1 for identical vectors", () => {
            const a = termFrequencies(["machine", "learning", "learning"]);
            const b = termFrequencies(["machine", "learning", "learning"]);
            expect(cosineSimilaritySparse(a, b)).toBeCloseTo(1, 5);
        });

        it("returns 0 for disjoint vectors", () => {
            const a = termFrequencies(["cat", "dog"]);
            const b = termFrequencies(["car", "plane"]);
            expect(cosineSimilaritySparse(a, b)).toBe(0);
        });

        it("returns 0 when one vector is empty", () => {
            const a = termFrequencies(["cat"]);
            const b = termFrequencies([]);
            expect(cosineSimilaritySparse(a, b)).toBe(0);
        });

        it("returns a value between 0 and 1 for partial overlap", () => {
            const a = termFrequencies(["machine", "learning", "models"]);
            const b = termFrequencies(["machine", "learning", "vision"]);
            const score = cosineSimilaritySparse(a, b);
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThan(1);
        });
    });

    describe("cosineSimilarityDense", () => {
        it("returns 1 for identical vectors", () => {
            expect(cosineSimilarityDense([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
        });

        it("returns 0 for orthogonal vectors", () => {
            expect(cosineSimilarityDense([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 6);
        });

        it("returns -1 for opposite vectors", () => {
            expect(cosineSimilarityDense([1, 0], [-1, 0])).toBeCloseTo(-1, 6);
        });

        it("returns a value in [-1, 1] for arbitrary vectors", () => {
            const sim = cosineSimilarityDense([0.5, 0.5], [0.3, 0.7]);
            expect(sim).toBeGreaterThanOrEqual(-1);
            expect(sim).toBeLessThanOrEqual(1);
        });

        it("returns 0 when either vector is empty", () => {
            expect(cosineSimilarityDense([], [1, 2])).toBe(0);
            expect(cosineSimilarityDense([1, 2], [])).toBe(0);
        });

        it("returns 0 when vectors have different lengths", () => {
            expect(cosineSimilarityDense([1, 0], [1, 0, 0])).toBe(0);
        });

        it("returns 0 when magnitude is zero", () => {
            expect(cosineSimilarityDense([0, 0], [1, 0])).toBe(0);
            expect(cosineSimilarityDense([1, 0], [0, 0])).toBe(0);
        });
    });

    describe("computeInverseDocumentFrequencies", () => {
        it("returns empty map for empty doc list", () => {
            const result = computeInverseDocumentFrequencies([]);
            expect(result.size).toBe(0);
        });

        it("returns 1 for every term in a single document", () => {
            const docs = [new Map([["a", 1], ["b", 2]])];
            const result = computeInverseDocumentFrequencies(docs);
            expect(result.get("a")).toBeCloseTo(1, 5);
            expect(result.get("b")).toBeCloseTo(1, 5);
        });

        it("returns higher inverse document frequency for rarer terms", () => {
            const hasThe = new Map([["the", 1]]);
            const hasBoth = new Map([["the", 3], ["neural", 1]]);
            const hasTheToo = new Map([["the", 2]]);
            const result = computeInverseDocumentFrequencies([hasThe, hasBoth, hasTheToo]);
            expect(result.get("neural")).toBeGreaterThan(result.get("the")!);
        });

        it("returns 1 for terms appearing in all documents", () => {
            const docs = [
                new Map([["term", 1]]),
                new Map([["term", 3], ["other", 1]]),
            ];
            const result = computeInverseDocumentFrequencies(docs);
            expect(result.get("term")).toBeCloseTo(1, 5);
        });

        it("computes correct inverse document frequencies for mixed frequencies", () => {
            const docs = [
                new Map([["a", 1], ["b", 1]]),
                new Map([["a", 1], ["c", 1]]),
                new Map([["a", 1], ["d", 1]]),
            ];
            const result = computeInverseDocumentFrequencies(docs);
            expect(result.get("a")).toBeCloseTo(1 + Math.log(3 / 3), 5);
            expect(result.get("b")).toBeCloseTo(1 + Math.log(3 / 1), 5);
        });
    });

    describe("applyInverseDocumentFrequency", () => {
        it("multiplies each term frequency by its inverse document frequency weight", () => {
            const termFrequency = new Map([["a", 2], ["b", 3]]);
            const inverseDocumentFrequency = new Map([["a", 1.5], ["b", 2]]);
            const result = applyInverseDocumentFrequency(termFrequency, inverseDocumentFrequency);
            expect(result.get("a")).toBeCloseTo(3, 5);
            expect(result.get("b")).toBeCloseTo(6, 5);
        });

        it("skips terms not present in inverse document frequency", () => {
            const termFrequency = new Map([["a", 2], ["b", 3]]);
            const inverseDocumentFrequency = new Map([["a", 1.5]]);
            const result = applyInverseDocumentFrequency(termFrequency, inverseDocumentFrequency);
            expect(result.has("b")).toBe(false);
            expect(result.get("a")).toBeCloseTo(3, 5);
        });

        it("returns same reference when inverse document frequency is empty", () => {
            const termFrequency = new Map([["a", 1]]);
            const inverseDocumentFrequency = new Map<string, number>();
            const result = applyInverseDocumentFrequency(termFrequency, inverseDocumentFrequency);
            expect(result).toBe(termFrequency);
        });

        it("returns empty map when term frequency is empty", () => {
            const termFrequency = new Map<string, number>();
            const inverseDocumentFrequency = new Map([["a", 1.5]]);
            const result = applyInverseDocumentFrequency(termFrequency, inverseDocumentFrequency);
            expect(result.size).toBe(0);
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
