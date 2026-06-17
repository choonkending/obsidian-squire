# Obsidian Squire 🛡️

[![Release Obsidian plugin](https://github.com/choonkending/obsidian-squire/actions/workflows/release.yml/badge.svg)](https://github.com/choonkending/obsidian-squire/actions/workflows/release.yml) ![GitHub Release](https://img.shields.io/github/v/release/choonkending/obsidian-squire)

**Your faithful note-taking companion.** Squire automates index numbering and surfaces related notes so you can stay in your flow state. No manual calculation, no hunting for connections.

### ✨ Features
- **Smart Index Numbering:** Automatically generate the new note's prefix (incrementing or nesting numbers) while leaving the title blank for you to instantly type the new subject. Right-click or command palette to duplicate.
- **Related Notes:** Automatically surface connected notes via word, tag, and link similarity — no manual searching required.

---

## 🎯 Why Squire? (The Problem)

Every action that breaks your typing flow — calculating the next index number, manually hunting for related notes — adds micro-friction that pulls you out of deep work.

If you use a structural note-taking framework like the [Zettelkasten Method](https://www.atlassian.com/blog/productivity/zettelkasten-method), you likely rely on a strict naming or numbering convention. As your vault grows, manually copying, pasting, and calculating the next index number becomes tedious.

Squire removes this friction on two fronts: it automates index numbering so you never do mental arithmetic, and it surfaces related notes so you never hunt for connections.

### Example Workflow
Imagine you use a simple numeric index for your notes:

```text
📂 Literature_Notes
 └── 📄 1 - Biology.md
```

If you want to create a new, unrelated note (e.g., Physics), you need to increment the number:

```text
📂 Literature_Notes
 ├── 📄 1 - Biology.md
 └── 📄 2 - Physics.md
```

If you want to create a child note related to Biology (e.g., Anatomy), you need to nest the number:

```text
📂 Literature_Notes
 ├── 📄 1 - Biology.md
 └── 📄 1.1 - Anatomy.md
```

## 🚀 Smart Index Numbering

*No mental arithmetic. No manual formatting. Just pick the command and type your subject.*

Right-click a note in the File Explorer and select **Duplicate: Increment Last Number** or **Duplicate: Nest Last Number**, or open the Command Palette (`Ctrl/Cmd+P`) and run the same commands. The new note appears in the same folder with the correctly computed prefix.

Transformers dictate how the new note's name is generated. (Note: The transformers intentionally leave the text after the number blank so you can immediately type your new topic).

> [!TIP]
> Have a unique naming convention? Please feel free to raise an issue or contribute a new transformer for your specific use case!

### 1. Increment Last Number
Finds the last number in your current note's title and increases it by 1. If no number is found, it appends a 1 to the end.

- `1 - Biology.md` → `2 - .md`
- `100 - Artificial Intelligence.md` → `101 - .md`

### 2. Nest Last Number
Adds a new sub-level number after the last decimal at the end of the note's index, nesting it one level deeper.

- `1 - Biology.md` → `1.1 - .md`
- `1.1 - Anatomy.md` → `1.1.1 - .md`

## 🔗 Related Notes

*Manually hunting for connections between notes interrupts your thinking. Squire automatically surfaces related notes using lexical scoring — no tagging tax, no manual cross-referencing.*

**Sidebar view:** Opens a persistent panel that auto-refreshes as you switch notes. Click a result to open it; click **Link** to insert `[[Title]]` at your cursor.

**Quick modal:** `Ctrl/Cmd+P` → **Show related notes** for a one-off look without changing your layout. Filter by typing.

**Ribbon icon:** The network icon toggles the sidebar view. The sidebar's open/closed state persists across Obsidian sessions.

## ⚙️ Settings

*Tune Squire to match your workflow without breaking your stride.*

**Index separator** — the character(s) between your index number and title (e.g. `-` in `1 - Biology.md`). Must be safe for file names, max 5 characters.

**Number of suggestions** — how many related notes to return (1–50, default 5).

**Match weights** — control how much word overlap, shared tags, and shared outgoing links influence similarity. Defaults: Words `1.0`, Tags `0.5`, Links `0.5`. Set to `0` to disable a signal.

## 📦 Installation

1. Find Squire in [Obsidian Community Plugins](https://community.obsidian.md/plugins/squire)
2. Select "Add to Obsidian"

## 🤝 Contributing & Support

I accept Pull Requests, GitHub Issues, and general feedback! If you have a specific use case or transformer idea, please look at contributing to help make Squire better for everyone.

Funding: If you find this plugin useful and it saves you time, just let me know—hearing how it helps your workflow is greatly appreciated!
