# Markup iOS — HTML support

> Shipped in 0.1.2 (build 1020). Markup now opens and renders `.html` as a
> first-class document type, alongside Markdown.

## What works
- **Vault lists HTML.** The scan includes `html`/`htm` (via
  `markupSupportedExtensions`), so `.html` files appear in the file list with a
  globe icon next to the Markdown `doc.richtext` icon.
- **Faithful rendering.** Tapping an `.html` file loads it directly in the
  `WKWebView` via `loadFileURL(_:allowingReadAccessTo:)` with read access to the
  **vault root**, so relative CSS / images / links resolve. (Markdown still
  renders via the `ReaderHTML` pipeline — marked + KaTeX/Mermaid/highlight.)
- **Search & Quick Open.** HTML is indexed by its **visible text** (tags /
  `<script>` / `<style>` stripped) with the `<title>` as the document title, so
  full-text search and Quick Open find HTML content (`HTMLDoc` in MarkupKit).
- **Edit the source.** The Read/Edit toggle works for HTML too — edit raw HTML
  in the source editor; on returning to Read it reloads the saved file.
- **Open in Markup.** `.md` and `.html` are registered document types
  (`CFBundleDocumentTypes` + the `net.daringfireball.markdown` UTI), so Markup is
  an "Open in" option from other apps; `onOpenURL` opens a single file in
  `ExternalFileReader` (`.html` shown as-authored, `.md` rendered).

## Design choices
- HTML is rendered **as-authored** — the reader does not inject themes/fonts into
  HTML files (they bring their own styles). Markdown-specific chrome (outline,
  backlinks, text-size, task-list toggle) is hidden for HTML; HTML gets a plain
  Share (the file itself).
- HTML indexing strips to plain text so the Markdown scans (wikilinks, tags,
  headings) no-op cleanly — no false `#anchor` tags.

## Not yet
- Theme-matching for HTML (e.g. forcing dark background on light HTML).
- Outline/anchor navigation inside HTML.
- Wikilink/backlink graph across HTML files.

_Files: `MarkupKit/HTMLDoc.swift` (+ tests), `VaultStore` (scan+index),
`ReaderWebView` (file-URL load), `ReaderView` (md/html branch),
`RootView` (icon), `Info.plist` (document types)._
