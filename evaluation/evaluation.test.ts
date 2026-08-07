import { resolve } from "path";
import { rankRelatedNotes } from "../src/related/ranking";
import { loadConfig } from "./config";
import { loadCorpus, loadGroundTruth } from "./corpus";
import { retrievalStats, average } from "./metrics";
import type { RetrievalStats } from "./metrics";

const REPO_ROOT = process.cwd();
const FIXTURES_DIR = resolve(REPO_ROOT, "evaluation/fixtures/golden-vault");
const GROUND_TRUTH_PATH = resolve(FIXTURES_DIR, "ground_truth.json");

function align(value: string, width: number): string {
    return value.padEnd(width);
}

function format(value: number): string {
    return (value * 100).toFixed(1) + "%";
}

export function runEvaluation(): { rows: Array<{ query: string; stats: RetrievalStats }>; aggregate: RetrievalStats } {
    const config = loadConfig();
    const corpus = loadCorpus(FIXTURES_DIR);
    const groundTruth = loadGroundTruth(GROUND_TRUTH_PATH);
    const notesByPath = new Map(corpus.map(note => [note.doc.path, note]));
    const allDocs = corpus.map(note => note.doc);

    const rows: Array<{ query: string; stats: RetrievalStats }> = [];
    for (const [queryPath, relevant] of Object.entries(groundTruth.queries)) {
        const query = notesByPath.get(queryPath);
        if (!query) {
            throw new Error(`Ground truth references missing note: ${queryPath}`);
        }
        const retrieved = rankRelatedNotes({
            target: query.doc,
            candidates: allDocs,
            weights: config.weights,
            limit: config.limit,
        }).map(result => result.path);
        rows.push({ query: queryPath, stats: retrievalStats(retrieved, relevant, config.limit) });
    }

    const tableRows = rows.map(row => ({
        query: row.query,
        ["P@" + config.limit]: format(row.stats.precisionAtK),
        ["R@" + config.limit]: format(row.stats.recallAtK),
        MRR: format(row.stats.meanReciprocalRank),
    }));
    console.table(tableRows);

    const aggregate = average(rows.map(row => row.stats));
    console.log("");
    console.log(`Algorithm: lexical (weights words=${config.weights.words}, tags=${config.weights.tags}, links=${config.weights.links}, k=${config.limit})`);
    console.log("── " + align("metric", 10) + " score");
    console.log("   " + align("Precision@k", 10) + format(aggregate.precisionAtK));
    console.log("   " + align("Recall@k", 10) + format(aggregate.recallAtK));
    console.log("   " + align("MRR", 10) + format(aggregate.meanReciprocalRank));
    console.log("   " + align("Composite", 10) + format((aggregate.precisionAtK + aggregate.recallAtK + aggregate.meanReciprocalRank) / 3));

    return { rows, aggregate };
}

describe("evaluation: related-notes retrieval quality (lexical)", () => {
    it("runs every ground-truth query and reports IR metrics", () => {
        const { aggregate, rows } = runEvaluation();
        expect(rows.length).toBeGreaterThan(0);
        expect(aggregate.precisionAtK).toBeGreaterThanOrEqual(0);
        expect(aggregate.precisionAtK).toBeLessThanOrEqual(1);
    });
});