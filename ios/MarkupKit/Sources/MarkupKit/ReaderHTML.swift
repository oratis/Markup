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
    ///   - assetBase: when non-nil, load the renderer assets from this base
    ///     (e.g. a bundled `markupasset:///` scheme) instead of the jsDelivr CDN,
    ///     so the reader works fully offline.
    public static func document(
        markdown: String, title: String, theme: ReaderTheme = .light,
        fontScale: Double = 1.0, maxWidth: Int = 720, lineHeight: Double = 1.65,
        restoreFraction: Double = 0, assetBase: String? = nil
    ) -> String {
        let math = needsMath(markdown)
        let mermaid = needsMermaid(markdown)

        let hljsTheme = (theme == .dark) ? "github-dark" : "github"
        let mermaidTheme = (theme == .dark) ? "dark" : "default"

        // Asset URLs: bundled (offline) when assetBase is set, else pinned CDN.
        func asset(_ cdn: String, _ local: String) -> String {
            assetBase.map { $0 + local } ?? cdn
        }
        let hljsCSS = asset(
            "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@\(hljsVersion)/styles/\(hljsTheme).min.css",
            "highlight/\(hljsTheme).min.css")
        let markedJS = asset(
            "https://cdn.jsdelivr.net/npm/marked@\(markedVersion)/marked.min.js", "marked.umd.js")
        let hljsJS = asset(
            "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@\(hljsVersion)/highlight.min.js",
            "highlight/highlight.min.js")

        var head = """
        <link rel="stylesheet" href="\(hljsCSS)">
        <script defer src="\(markedJS)"></script>
        <script defer src="\(hljsJS)"></script>
        """
        if math {
            let katexCSS = asset("https://cdn.jsdelivr.net/npm/katex@\(katexVersion)/dist/katex.min.css", "katex/katex.min.css")
            let katexJS = asset("https://cdn.jsdelivr.net/npm/katex@\(katexVersion)/dist/katex.min.js", "katex/katex.min.js")
            let autoRender = asset("https://cdn.jsdelivr.net/npm/katex@\(katexVersion)/dist/contrib/auto-render.min.js", "katex/auto-render.min.js")
            head += """

            <link rel="stylesheet" href="\(katexCSS)">
            <script defer src="\(katexJS)"></script>
            <script defer src="\(autoRender)"></script>
            """
        }
        if mermaid {
            let mermaidJS = asset("https://cdn.jsdelivr.net/npm/mermaid@\(mermaidVersion)/dist/mermaid.min.js", "mermaid.min.js")
            head += """

            <script defer src="\(mermaidJS)"></script>
            """
        }

        return """
        <!doctype html>
        <html lang="en">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <title>\(htmlEscape(title))</title>
        <style>\(css(theme, fontScale: fontScale, maxWidth: maxWidth, lineHeight: lineHeight))</style>
        \(head)
        <script defer>
        document.addEventListener("DOMContentLoaded", function () {
          var md = \(jsString(markdown));
          var content = document.getElementById("content");
          try { if (window.marked) content.innerHTML = window.marked.parse(md); }
          catch (e) { content.textContent = md; }

          // GitHub-style alerts: promote `> [!NOTE]`-style blockquotes into
          // styled callout blocks, matching the desktop export's comrak markup
          // (.markdown-alert-*). marked has no native support, so transform the
          // rendered DOM. CALLOUTS maps recognised types → default titles.
          var CALLOUTS = \(calloutTitleMapJS());
          content.querySelectorAll("blockquote").forEach(function (bq) {
            var w = document.createTreeWalker(bq, NodeFilter.SHOW_TEXT, null);
            var tn = w.nextNode();
            if (!tn) return;
            var m = /^\\s*\\[!(\\w+)\\]([^\\n]*)/.exec(tn.nodeValue);
            if (!m) return;
            var type = m[1].toLowerCase();
            if (!Object.prototype.hasOwnProperty.call(CALLOUTS, type)) return;
            var title = (m[2] || "").trim();
            // Drop the whole marker line from the first text node.
            var rest = tn.nodeValue.slice(m[0].length);
            if (rest.charAt(0) === "\\n") rest = rest.slice(1);
            tn.nodeValue = rest;
            var div = document.createElement("div");
            div.className = "markdown-alert markdown-alert-" + type;
            var h = document.createElement("p");
            h.className = "markdown-alert-title";
            h.textContent = title || CALLOUTS[type];
            div.appendChild(h);
            while (bq.firstChild) div.appendChild(bq.firstChild);
            var fp = h.nextElementSibling;
            if (fp && fp.tagName === "P" && fp.textContent.trim() === "") fp.remove();
            bq.replaceWith(div);
          });

          // Stable ids on headings so the native outline can scroll to them.
          content.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(function (el, i) {
            el.id = "mk-h" + i;
          });

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

    /// A JS object literal (`{note:"Note",…}`) of recognised callout types and
    /// their default titles, built from `Callout` so the reader transform and
    /// the desktop export stay in sync on the supported set.
    static func calloutTitleMapJS() -> String {
        let pairs = Callout.titles.map { "\($0.type):\(jsString($0.title))" }
        return "{" + pairs.joined(separator: ",") + "}"
    }

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

    private static func css(
        _ theme: ReaderTheme, fontScale: Double, maxWidth: Int, lineHeight: Double = 1.65
    ) -> String {
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
          line-height: \(String(format: "%.2f", min(2.4, max(1.2, lineHeight)))); word-wrap: break-word;
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
        .markdown-alert {
          border-left: 4px solid var(--alert, \(muted));
          background: var(--alert-bg, rgba(127,127,127,0.08));
          padding: 0.5em 1em; margin: 0 0 1em; border-radius: 0 6px 6px 0;
        }
        .markdown-alert > :first-child { margin-top: 0; }
        .markdown-alert > :last-child { margin-bottom: 0; }
        .markdown-alert-title {
          display: flex; align-items: center; gap: 0.4em;
          font-weight: 600; color: var(--alert, \(muted)); margin: 0 0 0.4em;
          text-transform: capitalize;
        }
        .markdown-alert-note { --alert: #0a84ff; --alert-bg: rgba(10,132,255,0.10); }
        .markdown-alert-tip { --alert: #30a14e; --alert-bg: rgba(48,161,78,0.10); }
        .markdown-alert-important { --alert: #8250df; --alert-bg: rgba(130,80,223,0.10); }
        .markdown-alert-warning { --alert: #bf8700; --alert-bg: rgba(191,135,0,0.12); }
        .markdown-alert-caution { --alert: #ff453a; --alert-bg: rgba(255,69,58,0.10); }
        .markdown-alert-note .markdown-alert-title::before { content: "ⓘ"; }
        .markdown-alert-tip .markdown-alert-title::before { content: "💡"; }
        .markdown-alert-important .markdown-alert-title::before { content: "❗"; }
        .markdown-alert-warning .markdown-alert-title::before { content: "⚠️"; }
        .markdown-alert-caution .markdown-alert-title::before { content: "🛑"; }
        table { border-collapse: collapse; margin: 0 0 1em; display: block; overflow-x: auto; }
        th, td { border: 1px solid \(muted); padding: 6px 10px; }
        tr:nth-child(even) { background: \(codeBg); }
        ul.contains-task-list { list-style: none; padding-left: 0.4em; }
        .task-list-item input { margin-right: 0.5em; }
        """
    }
}
