# awesome-list submissions (Phase A soft launch)

Durable, low-risk traffic. Submit **after** the rewritten README is live (reviewers click through). Signing not required.

## 1. awesome-tauri — `tauri-apps/awesome-tauri`

- **Section:** `### Office & Writing`
- **Placement:** alphabetical — between `MarkFlowy` and `MD Viewer`.
- **Badge:** `![v2]` (Markup is Tauri 2). CI runs `awesome-lint README.md`; mirror the exact existing format.

**Entry line:**
```
- [Markup](https://github.com/oratis/Markup) ![v2] - Reader-first, native macOS Markdown editor: renders notes like a web page and edits on demand, with a vault, backlinks, graph, and full-text search.
```

**Open the PR:**
```bash
gh repo fork tauri-apps/awesome-tauri --clone --fork-name awesome-tauri
cd awesome-tauri
git checkout -b add-markup
# insert the entry line in README.md between MarkFlowy and MD Viewer (alphabetical), then:
npx awesome-lint README.md          # must pass
git add README.md
git commit -m "Add Markup (Office & Writing)"
git push -u origin add-markup
gh pr create --repo tauri-apps/awesome-tauri \
  --title "Add Markup (Office & Writing)" \
  --body "Markup is a free, open-source (MIT), native macOS Markdown editor built on Tauri 2. Reader-first: renders Markdown like a web page and edits on demand; vault with wikilinks/backlinks/graph and Tantivy full-text search. https://github.com/oratis/Markup"
```

## 2. awesome-mac — `jaywcjlove/awesome-mac`

- **Section:** `### Markdown Tools`
- **Placement:** alphabetical — between `MarkText` and `MarkViewer`.
- **Icons:** open-source + freeware (reference-style, defined at bottom of their README).

**Entry line:**
```
* [Markup](https://github.com/oratis/Markup) - Reader-first, native macOS Markdown editor: renders notes like a web page and edits on demand, with vault, backlinks, graph, and full-text search. [![Open-Source Software][OSS Icon]](https://github.com/oratis/Markup) ![Freeware][Freeware Icon]
```

**Open the PR:**
```bash
gh repo fork jaywcjlove/awesome-mac --clone --fork-name awesome-mac
cd awesome-mac
git checkout -b add-markup
# insert the entry line under "### Markdown Tools", between MarkText and MarkViewer, then:
git add README.md
git commit -m "Add Markup to Markdown Tools"
git push -u origin add-markup
gh pr create --repo jaywcjlove/awesome-mac \
  --title "Add Markup to Markdown Tools" \
  --body "Markup — a free, open-source (MIT), native macOS Markdown editor. Reader-first: renders Markdown like a web page, edit on demand; vault + backlinks + graph + full-text search. https://github.com/oratis/Markup"
```

## 3. Others (same entry text, lower priority)
- `awesome-opensource-macos`, `BubuAnabelas/awesome-markdown` (Tools), any "awesome-electron-alternatives" style lists.
- Always: respect each list's section + alphabetical order; run their lint if they have one; one focused PR per list.
