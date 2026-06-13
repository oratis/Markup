# Sample vault for App Review

This small folder is a ready-to-open Markup **vault** for App Store / Mac App
Store reviewers (and for your own smoke tests). It exercises the headline
features so a reviewer sees a working app immediately instead of the empty
"bring your own folder" state.

How to use it:
- **iOS**: copy this folder into the Files app ("On My iPhone" or iCloud Drive),
  then in Markup tap **Open a Folder** and pick it.
- **Mac**: in Markup choose **Open Folder** (⌘⇧O) and pick this folder.

It contains:
- `welcome.md` — overview + a `[[wikilink]]` to `features.md`.
- `features.md` — code highlighting, a table, a task list, a GitHub-style
  callout, and (if math/diagrams are enabled) a LaTeX formula and a Mermaid
  diagram.
- `notes/meeting.md` — a second file in a subfolder, to show the file tree,
  search, and backlinks (it links back to `welcome.md`).

Everything here is plain Markdown — open any file in another editor to confirm
there's no proprietary format.
