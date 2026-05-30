import Foundation

/// Reader colour scheme for the rendered HTML document.
public enum ReaderTheme: String, Sendable, CaseIterable {
    case light, dark, sepia
}

/// Builds the high-fidelity reader document shown in the `WKWebView`.
///
/// Unlike the M0 `MarkdownLite` (which it replaces), this renders Markdown
/// **client-side** with `marked`, and conditionally loads `highlight.js`,
/// KaTeX, and Mermaid — matching the desktop export's fidelity and pinned
/// versions. Renderer assets are loaded from jsDelivr for this first cut, the
/// same way the desktop CDN-loads math/diagram renderers; bundling them
/// offline is a tracked follow-up (see docs/design/ios/00-ios-app-design.md §8).
public enum ReaderHTML {

    // Pinned to match the desktop app (src-tauri/src/commands.rs).
    static let katexVersion = "0.16.11"
    static let mermaidVersion = "11"
    static let markedVersion = "16"
    static let hljsVersion = "11"

    /// True when the document appears to contain KaTeX math. Conservative on
    /// inline `$…$` so prose like "$5 and $10" doesn't trip math rendering.
    public static func needsMath(_ md: String) -> Bool {
        if md.contains("$$") { return true }
        return md.range(of: "\\$[^\\s$\\d][^$\\n]*\\$", options: .regularExpression) != nil
    }

    /// True when the document has a ```mermaid fence.
    public static func needsMermaid(_ md: String) -> Bool {
        md.range(of: "(?m)^\\s*```\\s*mermaid\\b", options: .regularExpression) != nil
    }

    /// Render a full, self-contained reader document.
    ///
    /// - Parameters:
    ///   - fontScale: prose size multiplier (1.0 = system body).
    ///   - maxWidth: reading column width in px.
    ///   - restoreFraction: 0…1 scroll position to restore on load.
    public static func document(
        markdown: String, title: String, theme: ReaderTheme = .light,
        fontScale: Double = 1.0, maxWidth: Int = 720, restoreFraction: Double = 0
    ) -> String {
        let math = needsMath(markdown)
        let mermaid = needsMermaid(markdown)

        let hljsTheme = (theme == .dark) ? "github-dark" : "github"
        let mermaidTheme = (theme == .dark) ? "dark" : "default"

        var head = """
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@\(hljsVersion)/styles/\(hljsTheme).min.css">
        <script defer src="https://cdn.jsdelivr.net/npm/marked@\(markedVersion)/marked.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@\(hljsVersion)/highlight.min.js"></script>
        """
        if math {
            head += """

            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@\(katexVersion)/dist/katex.min.css">
            <script defer src="https://cdn.jsdelivr.net/npm/katex@\(katexVersion)/dist/katex.min.js"></script>
            <script defer src="https://cdn.jsdelivr.net/npm/katex@\(katexVersion)/dist/contrib/auto-render.min.js"></script>
            """
        }
        if mermaid {
            head += """

            <script defer src="https://cdn.jsdelivr.net/npm/mermaid@\(mermaidVersion)/dist/mermaid.min.js"></script>
            """
        }

        return """
        <!doctype html>
        <html lang="en">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <title>\(htmlEscape(title))</title>
        <style>\(css(theme, fontScale: fontScale, maxWidth: maxWidth))</style>
        \(head)
        <script defer>
        document.addEventListener("DOMContentLoaded", function () {
          var md = \(jsString(markdown));
          var content = document.getElementById("content");
          try { if (window.marked) content.innerHTML = window.marked.parse(md); }
          catch (e) { content.textContent = md; }

          // Promote ```mermaid code blocks to <div class="mermaid"> for mermaid.run().
          content.querySelectorAll("code.language-mermaid").forEach(function (el) {
            var pre = el.closest("pre") || el;
            var div = document.createElement("div");
            div.className = "mermaid";
            div.textContent = el.textContent;
            pre.replaceWith(div);
          });

          // Syntax highlighting (skip mermaid).
          if (window.hljs) {
            content.querySelectorAll("pre code").forEach(function (el) {
              if (!el.classList.contains("language-mermaid")) window.hljs.highlightElement(el);
            });
          }

          // Math.
          if (window.renderMathInElement) {
            window.renderMathInElement(content, {
              delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false }
              ],
              throwOnError: false
            });
          }

          // Diagrams.
          if (window.mermaid) {
            try {
              window.mermaid.initialize({ startOnLoad: false, theme: "\(mermaidTheme)" });
              window.mermaid.run();
            } catch (e) {}
          }

          // Task-list checkboxes → notify native (which rewrites the file).
          var boxes = content.querySelectorAll(".task-list-item input[type=checkbox], li input[type=checkbox]");
          boxes.forEach(function (box, i) {
            box.addEventListener("click", function (e) {
              e.preventDefault();
              try { window.webkit.messageHandlers.task.postMessage(i); } catch (e2) {}
            });
          });

          // Restore reading position, then report scroll fraction (debounced).
          var restore = \(clampFraction(restoreFraction));
          if (restore > 0) {
            requestAnimationFrame(function () {
              var h = document.body.scrollHeight - window.innerHeight;
              if (h > 0) window.scrollTo(0, h * restore);
            });
          }
          var t = null;
          window.addEventListener("scroll", function () {
            if (t) clearTimeout(t);
            t = setTimeout(function () {
              var h = document.body.scrollHeight - window.innerHeight;
              var f = h > 0 ? (window.scrollY / h) : 0;
              try { window.webkit.messageHandlers.scroll.postMessage(f); } catch (e3) {}
            }, 150);
          }, { passive: true });
        });
        </script>
        </head>
        <body>
        <div id="content"></div>
        </body>
        </html>
        """
    }

    // MARK: - Helpers

    static func htmlEscape(_ s: String) -> String {
        s.replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
    }

    static func clampFraction(_ v: Double) -> Double { min(1, max(0, v)) }

    /// Encode a Swift string as a safe JavaScript string literal (JSON-quoted),
    /// neutralising `</script>` so embedded markdown can't break out of the tag.
    static func jsString(_ s: String) -> String {
        let data = (try? JSONEncoder().encode(s)) ?? Data()
        let json = String(data: data, encoding: .utf8) ?? "\"\""
        return json
            .replacingOccurrences(of: "</", with: "<\\/")
            .replacingOccurrences(of: "\u{2028}", with: "\\u2028")
            .replacingOccurrences(of: "\u{2029}", with: "\\u2029")
    }

    // MARK: - Themes (minimal app chrome; desktop doc-themes are a follow-up)

    private static func css(_ theme: ReaderTheme, fontScale: Double, maxWidth: Int) -> String {
        let (bg, fg, muted, codeBg, accent): (String, String, String, String, String)
        switch theme {
        case .light: (bg, fg, muted, codeBg, accent) = ("#ffffff", "#1c1c1e", "#6b6b70", "#f4f4f6", "#0a84ff")
        case .dark:  (bg, fg, muted, codeBg, accent) = ("#1c1c1e", "#e6e6e8", "#9a9aa0", "#2c2c2e", "#0a84ff")
        case .sepia: (bg, fg, muted, codeBg, accent) = ("#f4ecd8", "#3a3228", "#7a6f5a", "#e8dcc0", "#9a6b3f")
        }
        let pct = Int((min(2.0, max(0.6, fontScale)) * 100).rounded())
        let width = max(360, maxWidth)
        return """
        :root { color-scheme: light dark; }
        html { -webkit-text-size-adjust: 100%; font-size: \(pct)%; }
        body {
          margin: 0 auto; padding: 24px 18px 64px; max-width: \(width)px;
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
        img { max-width: 100%; height: auto; }
        code {
          font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.9em;
          background: \(codeBg); padding: 0.15em 0.35em; border-radius: 5px;
        }
        pre {
          background: \(codeBg); padding: 14px 16px; border-radius: 10px;
          overflow-x: auto; margin: 0 0 1em;
        }
        pre code { background: none; padding: 0; }
        .mermaid { margin: 0 0 1em; text-align: center; }
        hr { border: none; border-top: 1px solid \(muted); margin: 2em 0; }
        blockquote { margin: 0 0 1em; padding-left: 1em; border-left: 3px solid \(muted); color: \(muted); }
        table { border-collapse: collapse; margin: 0 0 1em; display: block; overflow-x: auto; }
        th, td { border: 1px solid \(muted); padding: 6px 10px; }
        tr:nth-child(even) { background: \(codeBg); }
        ul.contains-task-list { list-style: none; padding-left: 0.4em; }
        .task-list-item input { margin-right: 0.5em; }
        """
    }
}
