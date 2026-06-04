import Foundation

/// What kind of document a file is, by extension.
public enum FileKind: Sendable {
    case markdown
    case html
    /// An Obsidian-style `.canvas` — listed and preserved untouched, but not
    /// rendered or body-indexed on iOS (a desktop feature; §11 placeholder).
    case canvas

    public static func of(_ name: String) -> FileKind? {
        switch (name as NSString).pathExtension.lowercased() {
        // Plain text (`.txt`) is read through the Markdown renderer — it
        // degrades cleanly (paragraphs/headings) and stays searchable.
        case "md", "markdown", "mdx", "mkd", "txt": return .markdown
        case "html", "htm": return .html
        case "canvas": return .canvas
        default: return nil
        }
    }
}

/// File extensions whose *text* Markup opens and full-text-indexes
/// (Markdown + plain text + HTML).
public let markupSupportedExtensions: Set<String> = [
    "md", "markdown", "mdx", "mkd", "txt", "html", "htm",
]

/// File extensions the vault *lists*. Wider than the indexed set: `.canvas`
/// files appear (with a "desktop only" placeholder) but are never body-indexed
/// or modified, preserving round-trip safety with the desktop app.
public let markupListableExtensions: Set<String> =
    markupSupportedExtensions.union(["canvas"])

/// Lightweight HTML inspection — enough to title and full-text-index an `.html`
/// file without a full parser. Used so HTML documents are searchable and named
/// in the vault. Rendering itself is done faithfully by the WebView.
public enum HTMLDoc {

    /// The `<title>` text, or nil.
    public static func title(_ html: String) -> String? {
        guard let g = Rx.groups("(?is)<title[^>]*>(.*?)</title>", html) else { return nil }
        let t = decodeEntities(stripTags(g[1])).trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
    }

    /// Visible text content: drops `<script>`/`<style>`, strips tags, decodes a
    /// few common entities, and collapses whitespace. For full-text search.
    public static func plainText(_ html: String) -> String {
        var s = html
        s = s.replacingOccurrences(of: "(?is)<script.*?</script>", with: " ", options: .regularExpression)
        s = s.replacingOccurrences(of: "(?is)<style.*?</style>", with: " ", options: .regularExpression)
        s = s.replacingOccurrences(of: "(?is)<head.*?</head>", with: " ", options: .regularExpression)
        s = stripTags(s)
        s = decodeEntities(s)
        s = s.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func stripTags(_ s: String) -> String {
        s.replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
    }

    static func decodeEntities(_ s: String) -> String {
        var r = s
        for (e, c) in [
            ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", "\""),
            ("&#39;", "'"), ("&apos;", "'"), ("&nbsp;", " "),
        ] {
            r = r.replacingOccurrences(of: e, with: c)
        }
        return r
    }
}
