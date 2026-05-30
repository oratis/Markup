import Foundation

/// Reader colour scheme for the rendered HTML document.
public enum ReaderTheme: String, Sendable, CaseIterable {
    case light, dark, sepia
}

/// A tiny, dependency-free Markdown → HTML renderer used by the **M0** reader so
/// the app can show notes as a page end-to-end. It intentionally covers only a
/// subset (headings, paragraphs, fenced code, unordered/ordered lists, and
/// inline bold / italic / code / links) and HTML-escapes everything else.
///
/// **This is a placeholder.** M1 replaces it with the high-fidelity pipeline
/// (GFM tables/task-lists, KaTeX, Mermaid, syntax highlighting) matching the
/// desktop output — see docs/design/ios/00-ios-app-design.md §8.
public enum MarkdownLite {

    /// Render a Markdown string to an HTML body fragment (no `<html>` wrapper).
    public static func renderBody(_ md: String) -> String {
        let lines = md.components(separatedBy: "\n")
        var html = ""
        var i = 0

        func blank(_ s: String) -> Bool {
            s.trimmingCharacters(in: .whitespaces).isEmpty
        }

        while i < lines.count {
            let line = lines[i]

            // Fenced code block.
            if line.hasPrefix("```") {
                let lang = String(line.dropFirst(3)).trimmingCharacters(in: .whitespaces)
                var code: [String] = []
                i += 1
                while i < lines.count && !lines[i].hasPrefix("```") {
                    code.append(lines[i]); i += 1
                }
                if i < lines.count { i += 1 } // consume closing fence
                let cls = lang.isEmpty ? "" : " class=\"language-\(escape(lang))\""
                html += "<pre><code\(cls)>\(escape(code.joined(separator: "\n")))</code></pre>\n"
                continue
            }

            // ATX heading.
            if let h = heading(line) {
                html += "<h\(h.level)>\(inline(h.text))</h\(h.level)>\n"
                i += 1
                continue
            }

            // Unordered list.
            if let first = unordered(line) {
                html += "<ul>\n<li>\(inline(first))</li>\n"
                i += 1
                while i < lines.count, let item = unordered(lines[i]) {
                    html += "<li>\(inline(item))</li>\n"; i += 1
                }
                html += "</ul>\n"
                continue
            }

            // Ordered list.
            if let first = ordered(line) {
                html += "<ol>\n<li>\(inline(first))</li>\n"
                i += 1
                while i < lines.count, let item = ordered(lines[i]) {
                    html += "<li>\(inline(item))</li>\n"; i += 1
                }
                html += "</ol>\n"
                continue
            }

            // Blank line.
            if blank(line) { i += 1; continue }

            // Paragraph: gather until a blank line or the start of another block.
            var para: [String] = []
            while i < lines.count,
                  !blank(lines[i]),
                  !lines[i].hasPrefix("```"),
                  heading(lines[i]) == nil,
                  unordered(lines[i]) == nil,
                  ordered(lines[i]) == nil {
                para.append(lines[i]); i += 1
            }
            html += "<p>\(inline(para.joined(separator: " ")))</p>\n"
        }

        return html
    }

    /// Render a full, self-contained HTML document with a bundled theme.
    public static func renderDocument(
        _ md: String, title: String, theme: ReaderTheme = .light
    ) -> String {
        """
        <!doctype html>
        <html lang="en">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <title>\(escape(title))</title>
        <style>\(css(theme))</style>
        </head>
        <body>
        \(renderBody(md))
        </body>
        </html>
        """
    }

    // MARK: - Block helpers

    private static func heading(_ line: String) -> (level: Int, text: String)? {
        guard let m = firstMatch("^(#{1,6})\\s+(.*)$", line) else { return nil }
        return (m[1].count, m[2])
    }

    private static func unordered(_ line: String) -> String? {
        firstMatch("^\\s*[-*+]\\s+(.*)$", line).map { $0[1] }
    }

    private static func ordered(_ line: String) -> String? {
        firstMatch("^\\s*\\d+\\.\\s+(.*)$", line).map { $0[1] }
    }

    // MARK: - Inline

    /// Render inline markup. Code spans are extracted first (so `*` inside code
    /// is literal), the remaining text is HTML-escaped, then links / bold /
    /// italic are applied.
    static func inline(_ raw: String) -> String {
        var out = ""
        var textBuf = ""
        func flush() {
            if !textBuf.isEmpty { out += emphasisAndLinks(escape(textBuf)); textBuf = "" }
        }
        var i = raw.startIndex
        while i < raw.endIndex {
            if raw[i] == "`" {
                let after = raw.index(after: i)
                if let close = raw[after...].firstIndex(of: "`") {
                    flush()
                    out += "<code>\(escape(String(raw[after..<close])))</code>"
                    i = raw.index(after: close)
                    continue
                }
            }
            textBuf.append(raw[i])
            i = raw.index(after: i)
        }
        flush()
        return out
    }

    private static func emphasisAndLinks(_ escaped: String) -> String {
        var s = escaped
        // [text](url)
        s = replace("\\[([^\\]]+)\\]\\(([^)\\s]+)\\)", in: s, with: "<a href=\"$2\">$1</a>")
        // **bold** (before italic so the inner * are not consumed)
        s = replace("\\*\\*([^*]+)\\*\\*", in: s, with: "<strong>$1</strong>")
        // *italic* and _italic_
        s = replace("\\*([^*]+)\\*", in: s, with: "<em>$1</em>")
        s = replace("(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])", in: s, with: "<em>$1</em>")
        return s
    }

    // MARK: - Utilities

    static func escape(_ s: String) -> String {
        var r = s
        r = r.replacingOccurrences(of: "&", with: "&amp;")
        r = r.replacingOccurrences(of: "<", with: "&lt;")
        r = r.replacingOccurrences(of: ">", with: "&gt;")
        r = r.replacingOccurrences(of: "\"", with: "&quot;")
        return r
    }

    private static func firstMatch(_ pattern: String, _ s: String) -> [String]? {
        guard let re = try? NSRegularExpression(pattern: pattern) else { return nil }
        let ns = s as NSString
        guard let m = re.firstMatch(in: s, range: NSRange(location: 0, length: ns.length))
        else { return nil }
        return (0..<m.numberOfRanges).map { idx in
            let r = m.range(at: idx)
            return r.location == NSNotFound ? "" : ns.substring(with: r)
        }
    }

    private static func replace(_ pattern: String, in s: String, with tmpl: String) -> String {
        guard let re = try? NSRegularExpression(pattern: pattern) else { return s }
        let ns = s as NSString
        return re.stringByReplacingMatches(
            in: s, range: NSRange(location: 0, length: ns.length), withTemplate: tmpl)
    }

    // MARK: - Themes (minimal; M1 swaps in the desktop CSS themes)

    private static func css(_ theme: ReaderTheme) -> String {
        let (bg, fg, muted, codeBg, accent): (String, String, String, String, String)
        switch theme {
        case .light: (bg, fg, muted, codeBg, accent) = ("#ffffff", "#1c1c1e", "#6b6b70", "#f4f4f6", "#0a84ff")
        case .dark:  (bg, fg, muted, codeBg, accent) = ("#1c1c1e", "#e6e6e8", "#9a9aa0", "#2c2c2e", "#0a84ff")
        case .sepia: (bg, fg, muted, codeBg, accent) = ("#f4ecd8", "#3a3228", "#7a6f5a", "#e8dcc0", "#9a6b3f")
        }
        return """
        :root { color-scheme: light dark; }
        html { -webkit-text-size-adjust: 100%; }
        body {
          margin: 0 auto; padding: 24px 18px 64px; max-width: 720px;
          background: \(bg); color: \(fg);
          font: -apple-system-body, system-ui, -apple-system, "SF Pro Text", sans-serif;
          line-height: 1.65; word-wrap: break-word;
        }
        h1,h2,h3,h4,h5,h6 { line-height: 1.25; margin: 1.6em 0 0.6em; font-weight: 700; }
        h1 { font-size: 1.8em; } h2 { font-size: 1.45em; } h3 { font-size: 1.2em; }
        p { margin: 0 0 1em; }
        a { color: \(accent); text-decoration: none; }
        a:active { opacity: 0.6; }
        ul,ol { margin: 0 0 1em; padding-left: 1.4em; }
        li { margin: 0.2em 0; }
        code {
          font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.9em;
          background: \(codeBg); padding: 0.15em 0.35em; border-radius: 5px;
        }
        pre {
          background: \(codeBg); padding: 14px 16px; border-radius: 10px;
          overflow-x: auto; margin: 0 0 1em;
        }
        pre code { background: none; padding: 0; }
        hr { border: none; border-top: 1px solid \(muted); margin: 2em 0; }
        blockquote { margin: 0 0 1em; padding-left: 1em; border-left: 3px solid \(muted); color: \(muted); }
        """
    }
}
