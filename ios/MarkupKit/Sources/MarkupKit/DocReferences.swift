import Foundation

/// Where a URL referenced by a document points, relative to that document's
/// location inside a repo / vault.
public enum DocRefTarget: Equatable, Sendable {
    /// A path inside the same repo/vault — normalized, repo-root-relative, no
    /// leading "/". Safe to look up in the local working copy.
    case inRepo(String)
    /// An absolute external URL: `http(s):`, a `//host` protocol-relative URL,
    /// or any other scheme (`mailto:`, `tel:`, `data:`, …). Open in Safari, never
    /// in the reader WebView.
    case external(String)
    /// A pure in-document fragment ("#section") — scroll, don't navigate.
    case anchor(String)
    /// A relative reference that escapes the repo root (or is empty) — can't be
    /// resolved to a file in the vault.
    case unresolvable(String)
}

/// What kind of reference produced the URL (drives asset-download decisions).
public enum DocRefKind: String, Equatable, Sendable, CaseIterable {
    case image, link, script, stylesheet
}

/// One referenced URL found in a document, with its raw text and classification.
public struct DocRef: Equatable, Sendable {
    public let raw: String
    public let kind: DocRefKind
    public let target: DocRefTarget
    public init(raw: String, kind: DocRefKind, target: DocRefTarget) {
        self.raw = raw
        self.kind = kind
        self.target = target
    }
}

/// Pure (no I/O, no UIKit) scanner that finds every URL a Markdown / HTML
/// document references and classifies it relative to the document's path in a
/// repo / vault.
///
/// This is the shared primitive behind two reading-experience features for
/// GitHub-sourced docs (see `docs/design/ios/03-github-primary-vault.md` §16):
///  1. **Asset fidelity** — `.inRepo` image/stylesheet/script refs are the set
///     to materialize into the local working copy so they stop 404-ing.
///  2. **Link interception** — the reader's `WKNavigationDelegate` opens
///     `.inRepo` links in-app, `.external` in Safari, and scrolls for `.anchor`,
///     instead of letting every tap silently fail.
///
/// Limitation: only **inline** Markdown links/images (`[t](url)` / `![a](url)`)
/// plus raw HTML `<img>/<script>/<link>/<a>` are scanned; reference-style
/// (`[t][id]` + `[id]: url`) is not (rare in practice).
public enum DocReferences {

    /// Classify a single raw href/src that appears in a document located at
    /// `docPath` (repo-relative, e.g. "docs/guide.md").
    public static func classify(_ raw: String, in docPath: String) -> DocRefTarget {
        let s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return .unresolvable(raw) }
        if s.hasPrefix("#") { return .anchor(s) }
        if s.hasPrefix("//") { return .external(s) } // protocol-relative
        if Rx.matches("^[a-zA-Z][a-zA-Z0-9+.\\-]*:", s) { return .external(s) } // scheme:
        // Relative (or leading "/") — drop ?query / #fragment, then resolve.
        let pathPart = String(s.prefix { $0 != "#" && $0 != "?" })
        if pathPart.isEmpty { return .anchor(s) }
        if let resolved = resolve(pathPart, from: docPath) { return .inRepo(resolved) }
        return .unresolvable(raw)
    }

    /// Resolve a relative (or leading-"/") path against the directory of
    /// `docPath`, normalizing "." / ".." and percent-decoding. Returns `nil`
    /// when the path escapes the repo root. The result is repo-root-relative
    /// with no leading slash.
    public static func resolve(_ rel: String, from docPath: String) -> String? {
        let decoded = rel.removingPercentEncoding ?? rel
        var stack: [String]
        if decoded.hasPrefix("/") {
            stack = [] // leading "/" → repo-root-relative
        } else {
            stack = docPath.split(separator: "/", omittingEmptySubsequences: true).map(String.init)
            if !stack.isEmpty { stack.removeLast() } // drop the document's own filename
        }
        for comp in decoded.split(separator: "/", omittingEmptySubsequences: true).map(String.init) {
            switch comp {
            case ".": continue
            case "..":
                if stack.isEmpty { return nil } // escapes the repo root
                stack.removeLast()
            default:
                stack.append(comp)
            }
        }
        return stack.isEmpty ? nil : stack.joined(separator: "/")
    }

    /// Image + link references in a Markdown document at `docPath`.
    public static func markdown(_ md: String, docPath: String) -> [DocRef] {
        let scan = stripCode(md)
        var out: [DocRef] = []
        // `![alt](url …)` and `[text](url …)`. Group 1 = "!" for images; the URL
        // is either `<…>` (group 2) or a bare token up to whitespace/`)` (group 3).
        let inline = "(!?)\\[[^\\]]*\\]\\(\\s*(?:<([^>]*)>|([^)\\s]+))"
        for g in Rx.allGroups(inline, scan) {
            let url = !g[2].isEmpty ? g[2] : g[3]
            if url.isEmpty { continue }
            out.append(DocRef(raw: url, kind: g[1] == "!" ? .image : .link,
                              target: classify(url, in: docPath)))
        }
        out.append(contentsOf: htmlRefs(scan, docPath: docPath))
        return out
    }

    /// img / script / stylesheet / link references in an HTML document at `docPath`.
    public static func html(_ html: String, docPath: String) -> [DocRef] {
        htmlRefs(html, docPath: docPath)
    }

    // MARK: - internals

    private static func htmlRefs(_ s: String, docPath: String) -> [DocRef] {
        var out: [DocRef] = []
        func collect(_ pattern: String, _ kind: DocRefKind) {
            for g in Rx.allGroups(pattern, s, [.caseInsensitive]) where !g[1].isEmpty {
                out.append(DocRef(raw: g[1], kind: kind, target: classify(g[1], in: docPath)))
            }
        }
        collect("<img\\b[^>]*?\\bsrc\\s*=\\s*[\"']([^\"']+)[\"']", .image)
        collect("<script\\b[^>]*?\\bsrc\\s*=\\s*[\"']([^\"']+)[\"']", .script)
        collect("<link\\b[^>]*?\\bhref\\s*=\\s*[\"']([^\"']+)[\"']", .stylesheet)
        collect("<a\\b[^>]*?\\bhref\\s*=\\s*[\"']([^\"']+)[\"']", .link)
        return out
    }

    /// Strip fenced + inline code so URLs inside code samples aren't mistaken
    /// for references.
    private static func stripCode(_ md: String) -> String {
        var s = replace(md, "(?ms)^[ \\t]*(```|~~~).*?^[ \\t]*\\1[ \\t]*$", "")
        s = replace(s, "`[^`\\n]*`", "")
        return s
    }

    private static func replace(_ s: String, _ pattern: String, _ with: String) -> String {
        guard let re = try? NSRegularExpression(pattern: pattern) else { return s }
        let ns = s as NSString
        return re.stringByReplacingMatches(
            in: s, range: NSRange(location: 0, length: ns.length), withTemplate: with)
    }
}
