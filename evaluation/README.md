# Squire offline evaluation suite

This directory contains an offline evaluation harness for Squire's "related notes"
search. It scores the ranking algorithm against a small, hand-curated golden set of
notes so a developer can measure search quality without launching Obsidian.

The harness is a Jest test that runs on every `npm test`, so it also guards
against ranking regressions.

## What gets scored

The evaluation applies the **real production scoring path** — `rankRelatedNotes`
(`src/related/ranking.ts`) — to the golden-vault corpus. It uses the exact same
weights and result limit the plugin would use, sourced from the repo's live
settings file (`data.json` at the repo root). **No `obsidian` APIs are touched**;
the harness is pure Node + the plugin's own pure text/scoring modules.

Three Information Retrieval metrics are reported per query and macro-averaged:

- **Precision@K** — fraction of the top-K retrieved notes that are relevant.
- **Recall@K** — fraction of the relevant set that appears in the top K.
- **Mean Reciprocal Rank (MRR)** — how quickly the first relevant note surfaces.

`K` is the plugin's `relatedNotesLimit` (default **5**). A composite
`(P@K + R@K + MRR) / 3` is printed as a single regression signal.

## Running the evaluation

```bash
# The whole suite (unit + evaluation)
npm test

# Just the evaluation
npx jest evaluation
```

The report is printed to the console as a per-query table plus aggregate scores.

## How queries are chosen, and the Corpus/Query split

- **Corpus** = every `.md` file under `evaluation/fixtures/golden-vault/`.
- **Queries** = the seed notes listed as keys in `ground_truth.json`. Their
  relevance judgments are the values (the notes that "should" be returned).

`ground_truth.json` therefore holds **only** queries and relevance judgments.
Corpus content lives in the markdown files.

## Adding notes to the golden set

1. Create a `.md` file inside `evaluation/fixtures/golden-vault/` (any
   subfolder depth is fine).
2. The **filename** is used as the note's title (markdown headings are ignored
   for content tokenisation, matching the plugin).
3. Optional signals the search uses:
   - tags: a line like `#machinelearning` (see `extractTags` in `corpus.ts`).
   - links: wikilinks `[[other-note]]` to a sibling note.
4. Add the note's path (relative to the vault, `cluster/note.md`) to a seed's
   relevance list in `ground_truth.json` if it is a relevant result.

Caveats for realistic judgments:
- A query should not list itself as relevant.
- Prefer several topical clusters plus a few off-topic "distractor" notes so
  precision and MRR are discernible from recall.

## Editing relevance judgments

`evaluation/fixtures/golden-vault/ground_truth.json`:

```json
{
  "queries": {
    "ml/neural-networks.md": ["ml/regularization.md", "ml/hyperparameters.md"]
  }
}
```

The key is the query seed; the array is the set of notes the search **should**
return for it. Paths are relative to the golden-vault root, with `/` separators
and the `.md` extension.

## Scoring configuration

Weights and result limit are read from the repo's settings (`data.json`):
`weightWords`, `weightTags`, `weightLinks`, and `relatedNotesLimit`. Missing or
invalid values fall back to the plugin defaults (`DEFAULT_WEIGHTS`, `DEFAULT_RESULT_LIMIT`).

To run the evaluation against a different settings snapshot without editing
`data.json`, run Jest with an override of that file or point `loadConfig` at
another root. See `evaluation/config.ts`.

## How markdown is parsed safely

- Corpus text passes through the plugin's own `tokensWithTitleBoost` →
  `tokenize` → `stripMarkdown`, so the harness measures the engine on the same
  token pipeline production uses (code blocks, inline code, links, and emphasis
  are stripped identically).
- The loader reads only `**/*.md` (the `ground_truth.json` is never treated as a
  note), sorts paths for deterministic iteration, and treats empty/whitespace
  bodies as empty token maps (score 0, never throws).
- File contents are read as plain strings and transformed via regex → `Map`/`Set`.
  Nothing is executed or evaluated.

### Fidelity caveat

`tags` and `links` are approximated with narrow regexes (`corpus.ts`) rather than
Obsidian's `metadataCache`. Word tokens — the dominant scoring signal — are
identical to production. Shared-tag and shared-link relevance may differ
slightly from an Obsidian session. Any such differences show up as lower scores,
which the harness exposes rather than hides.

## Adding a search algorithm for comparison

Each algorithm is expressed as how the shared `rankRelatedNotes`
(`../src/related/ranking.ts`) is invoked. Today only the lexical path is scored
(`semanticScores` left undefined). To compare hybrid or semantic-only, compute an
embedding-based `semanticScores` map headlessly (using `rawText` on each
`CorpusNote`) and pass it into `rankRelatedNotes`, then add it to the report in
`evaluation.test.ts`. No `obsidian` or worker plumbing is required.