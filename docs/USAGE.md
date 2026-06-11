# Using Markup

Markup is **reader-first**: open a folder of Markdown and it renders like a web
page. Editing is on demand. This guide covers the things that aren't obvious from
the toolbar — search syntax, navigation, and Canvas.

> Almost every action lives in the **Command Palette** (`⌘⇧P`). Each command
> shows its shortcut next to it, and you can remap any of them in
> **Settings → Shortcuts**. When in doubt, open the palette and type.

## Three modes

| Mode | Enter with | What it is |
|---|---|---|
| **Read** (default) | — | your Markdown rendered as a document |
| **Edit** | `E` | WYSIWYG editing (Milkdown) |
| **Source** | `⌘/` | raw Markdown (CodeMirror) |

## Opening files and vaults

- **Open a vault** (a folder) — `⌘⇧O`. The file tree, search, wikilinks,
  backlinks and graph all operate over the vault.
- **Open a single file** — `⌘O`, drag a `.md` / `.markdown` / `.html` /
  `.canvas` file onto the window, or double-click it in Finder.

## Search

Two complementary tools:

### Quick Open — `⌘P`

Fuzzy-jump by name. A leading character switches what you search:

| Type | Searches |
|---|---|
| `report` | file names |
| `#heading text` | headings across the vault |
| `^block text` | `^block-id` anchors across the vault |

### Full-text search — `⌘⇧F`

Searches file *contents* (Tantivy index). Operators combine with free text:

| Operator | Meaning | Example |
|---|---|---|
| `tag:` | notes carrying a tag — leading `#` optional, nest with `/` | `tag:todo` · `tag:#todo` · `tag:projects/markup` |
| `path:` | restrict to a folder / path prefix | `path:journal/` |
| free text | full-text match | `release notes` |

They stack: `tag:todo path:journal/ release` finds notes tagged `#todo`, under
`journal/`, matching "release".

## Links and navigation

- **Wikilinks** — `[[file]]`, `[[file#Heading]]`, `[[file#^block]]`,
  `[[file|label]]`. Type `[[` for an inline picker; click a link to follow it.
- **Backlinks** — the right rail lists every note linking to the current one.
- **Outline** — the document's heading tree; click a heading to jump.
- **Tags** — `#tag` in your text; the Tags pane lists them with counts, click to
  search.
- **Graph** — a force-directed view of how your notes link together.
- **Bookmarks** — star any file to pin it in the Bookmarks pane.

## Canvas (`.canvas`)

Markup opens and saves Obsidian-compatible `.canvas` whiteboards.

| Action | How |
|---|---|
| Create a text node | double-click empty canvas (or Shift-drag to size one) |
| Move / resize | drag the node / drag its handles |
| Connect nodes | drag from a node's edge anchor to another node |
| Select | click, Shift-click, or drag a selection rectangle |
| Delete | select, then `Delete` / `Backspace` |
| Pan | Space-drag, middle-mouse-drag, or two-finger scroll |
| Zoom | ⌘/Ctrl-scroll; `⌘0` resets the viewport |
| Undo / redo | `⌘Z` / `⌘⇧Z` |

Start a new one with **New Canvas in Vault…** from the Command Palette.

## Export and share

- **Preview as HTML** — opens the rendered note in your default browser.
- **Export as HTML** — a themed, high-fidelity `.html` (GitHub / plain / Tufte)
  that keeps syntax-highlighted code, KaTeX math, Mermaid diagrams, tables, task
  lists and heading anchors. Ordinary docs export as a single self-contained,
  offline file; only docs that actually use math/diagrams load those renderers
  from a CDN.
- **Print / Save as PDF** — via the system print sheet (it waits for math and
  diagrams to finish rendering first).

## Customization

- **Themes** — Light / Dark / Sepia (plus Auto), in Settings (`⌘,`).
- **Typography** — prose font size and max line width.
- **Focus / Typewriter** modes for distraction-free writing.
- **Shortcuts** — remap any command in Settings → Shortcuts.
- **Language** — English / 中文, auto-detected from the system.
