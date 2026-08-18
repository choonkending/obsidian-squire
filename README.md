

# Obsidian Squire 🛡️

[![Release Obsidian plugin](https://github.com/choonkending/obsidian-squire/actions/workflows/release.yml/badge.svg)](https://github.com/choonkending/obsidian-squire/actions/workflows/release.yml) ![GitHub Release](https://img.shields.io/github/v/release/choonkending/obsidian-squire)

**Your faithful note-taking companion.** Squire surfaces related notes and automates file naming so you can stay in flow. Each feature is independent — use one, two, or all three.

---

## 🔗 Related Notes

*Manually hunting for connections between notes interrupts your thinking. Squire automatically surfaces related notes using lexical scoring — no tagging tax, no manual cross-referencing.*

**Zero configuration.** Related notes work immediately using TF-IDF word overlap, shared tags, and outgoing link similarity.

**Sidebar view:** Opens a persistent panel that auto-refreshes as you switch notes. An algorithm badge in the header shows which scorer is active (TF‑IDF / Hybrid). Click a result to open it; click **Link** to insert `[[Title]]` at your cursor.

**Quick modal:** `Ctrl/Cmd+P` → **Show related notes** for a one-off lookup without changing your layout. Filter by typing.

**Ribbon icon:** The network icon toggles the sidebar view. The sidebar's open/closed state persists across Obsidian sessions.

**Match weights** in Settings let you dial how much words, tags, and links influence results. Set any weight to `0` to disable that signal.

### 🧠 Semantic Search (Optional)

*Experimental. Adds dense-embedding understanding so notes with different wording but the same meaning still surface.*

Select a transformer model in **Settings → Related Notes → Scorer**. The model downloads on first use and is cached. The first indexing pass on a large vault may take several minutes.

When a model is active, Squire combines TF‑IDF and dense-embedding cosine similarity into a single hybrid score. Switch back to lexical-only any time by selecting **Tf-idf (lexical only)**.

**Rebuild everything** in Settings clears all cached model files and computed embeddings, then re-indexes your vault from scratch.

---

## 🗂 File Management

*No mental arithmetic. No manual formatting. Just pick the command and type your subject.*

Right-click a note in the File Explorer and select **Duplicate: Increment Last Number** or **Duplicate: Nest Last Number**, or open the Command Palette (`Ctrl/Cmd+P`) and run **Squire: Increment Last Number** or **Squire: Nest Last Number**. The new note appears in the same folder with the correctly computed prefix.

The **Index separator** setting defines the character between your index number and title (default `-`).

### Increment Last Number
Finds the last number in your current note's title and increases it by 1.

- `1 - Biology.md` → `2 - .md`
- `100 - Artificial Intelligence.md` → `101 - .md`

### Nest Last Number
Adds a new sub-level after the last decimal in the note's index.

- `1 - Biology.md` → `1.1 - .md`
- `1.1 - Anatomy.md` → `1.1.1 - .md`

> [!TIP]
> Have a unique naming convention? Raise an issue or contribute a new transformer.

---

## ⚙️ Settings

| Setting | Feature | Description |
|---|---|---|
| Show sidebar on startup | Related Notes | Auto-open the related notes sidebar |
| Number of suggestions | Related Notes | How many results to show (1–50) |
| Scorer | Related Notes — Scoring | TF‑IDF (lexical) or hybrid semantic model |
| Word match weight | Related Notes | How strongly word similarity affects results (default: 1) |
| Tag match weight | Related Notes | How strongly shared tags affect results (default: 0.5) |
| Link match weight | Related Notes | How strongly shared outgoing links affect results (default: 0.5) |
| Rebuild everything | Related Notes — Scoring | Clear caches + re-index vault |
| Index separator | File Management | Character between number and title |

---

## 📦 Installation

1. Find Squire in [Obsidian Community Plugins](https://community.obsidian.md/plugins/squire)
2. Select "Add to Obsidian"

---

## 🤝 Contributing & Support

Pull requests, issues, and feedback welcome! If you have a specific naming convention or feature idea, feel free to contribute.

Funding: If Squire saves you time, hearing how it helps is greatly appreciated!
