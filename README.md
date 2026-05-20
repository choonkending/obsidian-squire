# Obsidian Squire 🛡️

[![Release Obsidian plugin](https://github.com/choonkending/obsidian-squire/actions/workflows/release.yml/badge.svg)](https://github.com/choonkending/obsidian-squire/actions/workflows/release.yml) ![GitHub Release](https://img.shields.io/github/v/release/choonkending/obsidian-squire)

**Your faithful note-taking companion.** Squire automatically handles incremental file naming and note duplication so you can stay in your flow state. By applying preset rules to duplicate and rename your current notes, Squire removes the friction of manual formatting while strictly adhering to your established note-taking identification system.

### ✨ Features
- **Smart Duplication:** Right-click menus and command palette options to seamlessly duplicate your current note.
- **Title Transformers:** Automatically generate the new note's prefix (e.g., incrementing or nesting numbers) while leaving the title blank for you to instantly type the new subject.

**Demo:** https://github.com/user-attachments/assets/49f91986-7b20-4a31-848e-2bd6bd77bf3a

---

## 🎯 Why Squire? (The Problem)

If you use a structural note-taking framework like the [Zettelkasten Method](https://www.atlassian.com/blog/productivity/zettelkasten-method), you likely rely on a strict naming or numbering convention. 

As your vault grows, manually copying, pasting, and calculating the next index number for a new note becomes tedious and *gets in the way of your actual thinking.* Squire automates this.

### Example Workflow
Imagine you use a simple numeric index for your notes:

```text
📂 Literature_Notes
 └── 📄 1 - Biology.md
```

If you want to create a new, unrelated note (e.g., Physics), you need to increment the number:

```text
Plaintext
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

## 🛠️ Title Transformers
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

## 🚀 Usage
1. Trigger the Duplication: - Right-click a note in the File Explorer and select your desired duplication mode.
  - OR open the Command Palette (`Ctrl/Cmd + P`) and run the Squire duplication command.
2. Rename & Write: The new note will appear in the exact same folder with the correctly incremented prefix. Just type your new title and start writing!

Customizing Content Extraction
Don't want to copy the entire text of the previous note?


📦 Installation

1. Find squire in [https://community.obsidian.md/plugins/squire](https://community.obsidian.md/plugins/squire)
2. Select "Add to Obsidian"


🤝 Contributing & Support
I accept Pull Requests, GitHub Issues, and general feedback! If you have a specific use case or transformer idea, please look at contributing to help make Squire better for everyone.

Funding: If you find this plugin useful and it saves you time, just let me know—hearing how it helps your workflow is greatly appreciated!
