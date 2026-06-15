import MarkupKit
import SwiftUI
import UIKit
import WebKit

/// Custom URL scheme that serves the bundled renderer assets (marked, KaTeX,
/// Mermaid, highlight.js + fonts) so the reader works fully offline.
let readerAssetScheme = "markupasset"
let readerAssetBase = "markupasset:///"

/// Serves files from the app bundle's `ReaderAssets/` folder over the custom
/// scheme. Relative URLs inside the assets (e.g. KaTeX's `fonts/…`) resolve
/// against the requesting asset, so the whole tree is reachable.
final class ReaderAssetSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root = Bundle.main.resourceURL?.appendingPathComponent("ReaderAssets")

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let root else {
            task.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        var rel = url.path
        if rel.hasPrefix("/") { rel.removeFirst() }
        let fileURL = root.appendingPathComponent(rel).standardizedFileURL
        guard fileURL.path.hasPrefix(root.standardizedFileURL.path),
              let data = try? Data(contentsOf: fileURL) else {
            task.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        let response = URLResponse(
            url: url, mimeType: Self.mime(fileURL.pathExtension),
            expectedContentLength: data.count, textEncodingName: nil)
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "js": return "text/javascript"
        case "css": return "text/css"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "ttf": return "font/ttf"
        default: return "application/octet-stream"
        }
    }
}

/// A WebView configuration wired to serve bundled reader assets offline.
func makeReaderConfiguration() -> WKWebViewConfiguration {
    let config = WKWebViewConfiguration()
    config.setURLSchemeHandler(ReaderAssetSchemeHandler(), forURLScheme: readerAssetScheme)
    return config
}

/// Holds a weak reference to the live reader WebView so other views (e.g. the
/// outline) can drive it — currently to scroll to a heading.
@MainActor
final class WebViewProxy: ObservableObject {
    fileprivate weak var webView: WKWebView?

    func scrollToHeading(_ index: Int) {
        webView?.evaluateJavaScript(
            "document.getElementById('mk-h\(index)')?.scrollIntoView({behavior:'smooth',block:'start'});",
            completionHandler: nil)
    }

    /// Scroll to the heading matching a GitHub-style `#fragment` slug (e.g.
    /// `post-users`), resolved against the renderer's slug→heading-id map. A
    /// no-op on documents without the hook (raw HTML, an unknown slug).
    func scrollToSlug(_ slug: String) {
        let arg = ReaderHTML.javaScriptStringLiteral(slug)
        webView?.evaluateJavaScript(
            "window.__markupScrollToSlug && window.__markupScrollToSlug(\(arg));",
            completionHandler: nil)
    }
}

/// Displays rendered HTML in a `WKWebView` and bridges scroll position and
/// task-list taps back to native.
struct ReaderWebView: UIViewRepresentable {
    var html: String = ""
    var baseURL: URL? = nil
    /// When set, the WebView loads this file directly (for `.html` documents),
    /// granting read access to `readAccessURL` so relative CSS/images/links work.
    var fileURL: URL? = nil
    var readAccessURL: URL? = nil
    /// Bump to force a reload of the same source (e.g. after editing an HTML file).
    var loadToken: Int = 0
    /// Whether scripts may run. The markdown-render path keeps this `true` (its
    /// bundled renderer needs JS); for a raw `.html` document callers pass the
    /// user's per-doc choice (off by default, so untrusted shared HTML can't
    /// execute JS until opted in).
    var javaScriptEnabled: Bool = true
    /// Render a raw `.html` page in desktop mode (wider viewport + desktop UA)
    /// instead of mobile — useful for web reports/PPTs designed for a laptop.
    var preferDesktop: Bool = false
    /// When set (live-preview pane), edited markdown is pushed into the already
    /// loaded document via `window.__markupSetMarkdown(...)` — an in-place
    /// re-render, so the preview updates without a full reload (no flicker or
    /// scroll jump). The `html` shell stays stable across keystrokes.
    var liveMarkdown: String? = nil
    /// When set, a tapped link to a Markdown/HTML file inside this root (a
    /// GitHub working copy) is intercepted instead of navigated: the WebView
    /// cancels and `onInRepoDoc` is called with the repo-relative path, so the
    /// reader can download + open that doc in-app rather than 404 on a file that
    /// was never materialized. The optional second argument is the link's
    /// `#fragment` (e.g. `post-users`), so the opened doc can scroll to the anchor.
    var inRepoRoot: URL? = nil
    var onInRepoDoc: (String, String?) -> Void = { _, _ in }
    /// Called each time the document finishes loading — used to scroll to a
    /// pending `#fragment` once the headings exist.
    var onFinishLoad: () -> Void = {}
    var proxy: WebViewProxy? = nil
    var onScroll: (Double) -> Void = { _ in }
    var onToggleTask: (Int) -> Void = { _ in }

    func makeUIView(context: Context) -> WKWebView {
        let config = makeReaderConfiguration()
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "scroll")
        controller.add(context.coordinator, name: "task")
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        proxy?.webView = webView
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        proxy?.webView = webView
        context.coordinator.onScroll = onScroll
        context.coordinator.onToggleTask = onToggleTask
        context.coordinator.allowJavaScript = javaScriptEnabled
        context.coordinator.preferDesktop = preferDesktop
        context.coordinator.inRepoRoot = inRepoRoot
        context.coordinator.onInRepoDoc = onInRepoDoc
        context.coordinator.onFinishLoad = onFinishLoad
        context.coordinator.loadedFilePath = fileURL?.standardizedFileURL.path
        // In-memory HTML to fall back to if the file:// load fails or the file
        // isn't on disk yet — so the reader never shows a blank/black page.
        context.coordinator.fallbackHTML = html
        context.coordinator.fallbackBaseURL = baseURL ?? fileURL?.deletingLastPathComponent()
        let key = (fileURL.map { "file:" + $0.path } ?? html) + "#\(loadToken)"
        if context.coordinator.lastHTML != key {
            context.coordinator.lastHTML = key
            context.coordinator.loaded = false
            context.coordinator.didFallback = false
            if let fileURL, FileManager.default.fileExists(atPath: fileURL.path) {
                // On-disk doc (raw .html, or an app-owned vault's rendered
                // sibling): a file load grants read access so relative
                // images/CSS resolve against the working copy.
                webView.loadFileURL(
                    fileURL, allowingReadAccessTo: readAccessURL ?? fileURL.deletingLastPathComponent())
            } else if !html.isEmpty {
                // No file on disk yet (an app-owned sibling is written just
                // after first paint) — render the in-memory HTML now so the page
                // is never blank; the post-write token bump reloads from the
                // file for full fidelity (relative images).
                webView.loadHTMLString(html, baseURL: baseURL ?? fileURL?.deletingLastPathComponent())
            } else if let fileURL {
                // Raw .html doc with no fallback string: load it directly.
                webView.loadFileURL(
                    fileURL, allowingReadAccessTo: readAccessURL ?? fileURL.deletingLastPathComponent())
            }
        }

        // Live-preview: push edited markdown into the loaded document in place.
        if let live = liveMarkdown, context.coordinator.lastLive != live {
            context.coordinator.lastLive = live
            if context.coordinator.loaded { context.coordinator.pushMarkdown(into: webView, live) }
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onScroll: onScroll, onToggleTask: onToggleTask)
    }

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        var lastHTML: String?
        var onScroll: (Double) -> Void
        var onToggleTask: (Int) -> Void
        var allowJavaScript = true
        var preferDesktop = false
        var inRepoRoot: URL?
        var onInRepoDoc: (String, String?) -> Void = { _, _ in }
        var onFinishLoad: () -> Void = {}
        /// Standardized path of the file currently loaded (so same-doc anchor
        /// taps aren't mistaken for in-repo navigations).
        var loadedFilePath: String?
        /// Live-preview bookkeeping: the last markdown pushed, and whether the
        /// document has finished loading (so a push has somewhere to land).
        var lastLive: String?
        var loaded = false
        /// In-memory HTML + base to fall back to when a file:// load fails, so a
        /// read-access/not-found error degrades to a readable page, not black.
        /// `didFallback` guards against re-entering the fallback for one load.
        var fallbackHTML = ""
        var fallbackBaseURL: URL?
        var didFallback = false

        init(onScroll: @escaping (Double) -> Void, onToggleTask: @escaping (Int) -> Void) {
            self.onScroll = onScroll
            self.onToggleTask = onToggleTask
        }

        /// Repo-relative path of `url` if it is a Markdown/HTML/text document
        /// inside `root`; otherwise `nil` (external, an asset, or escaping root).
        static func inRepoDocPath(_ url: URL, under root: URL) -> String? {
            let rootPath = root.standardizedFileURL.path
            let p = url.standardizedFileURL.path
            let prefix = rootPath.hasSuffix("/") ? rootPath : rootPath + "/"
            guard p.hasPrefix(prefix) else { return nil }
            let docExts: Set<String> = ["md", "markdown", "mdx", "mkd", "html", "htm", "txt", "text"]
            guard docExts.contains(url.pathExtension.lowercased()) else { return nil }
            return String(p.dropFirst(prefix.count))
        }

        func pushMarkdown(into webView: WKWebView, _ md: String) {
            let arg = ReaderHTML.javaScriptStringLiteral(md)
            webView.evaluateJavaScript("window.__markupSetMarkdown(\(arg));", completionHandler: nil)
        }

        // Once loaded, flush the latest live markdown (covers the initial load
        // and any shell reload, e.g. a theme change).
        func webView(_ webView: WKWebView, didFinish _: WKNavigation!) {
            loaded = true
            if let md = lastLive { pushMarkdown(into: webView, md) }
            onFinishLoad()
        }

        // A document load failed (e.g. a file:// read-access denial, or the
        // app-owned sibling wasn't on disk). Degrade to the in-memory HTML so the
        // reader shows the document instead of a blank/black page. Deliberate
        // cancels (in-repo link interception, external-link opens) are ignored.
        func webView(
            _ webView: WKWebView, didFailProvisionalNavigation _: WKNavigation!, withError error: Error
        ) {
            let ns = error as NSError
            let cancelled = (ns.domain == NSURLErrorDomain && ns.code == NSURLErrorCancelled)
                || (ns.domain == "WebKitErrorDomain" && ns.code == 102) // interrupted by policy
            guard !cancelled, !fallbackHTML.isEmpty, !didFallback else { return }
            didFallback = true
            webView.loadHTMLString(fallbackHTML, baseURL: fallbackBaseURL)
        }

        func userContentController(
            _ controller: WKUserContentController, didReceive message: WKScriptMessage
        ) {
            guard let number = message.body as? NSNumber else { return }
            switch message.name {
            case "scroll": onScroll(number.doubleValue)
            case "task": onToggleTask(number.intValue)
            default: break
            }
        }

        // Gate JavaScript per navigation so the HTML script toggle takes effect
        // on reload without recreating the WebView.
        func webView(
            _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
            preferences: WKWebpagePreferences,
            decisionHandler: @escaping (WKNavigationActionPolicy, WKWebpagePreferences) -> Void
        ) {
            preferences.allowsContentJavaScript = allowJavaScript
            preferences.preferredContentMode = preferDesktop ? .desktop : .mobile

            if navigationAction.navigationType == .linkActivated,
               let url = navigationAction.request.url {
                // In-repo file links (working copy).
                if url.isFileURL {
                    let p = url.standardizedFileURL.path
                    // An anchor within the currently rendered doc → stay put; the
                    // rendered Markdown lives in a sibling `<doc>.md.html`, so a
                    // self-link spelling the source name resolves to `<doc>`
                    // itself — also "same doc", so don't re-fetch or load the raw
                    // .md.
                    if let loaded = loadedFilePath, p == loaded || loaded == p + ".html" {
                        if p == loaded {
                            // The link targets the loaded file itself (e.g. a raw
                            // HTML doc's own anchor) → let WebKit scroll natively.
                            decisionHandler(.allow, preferences)
                        } else {
                            // The link spells the source `.md` but we loaded the
                            // rendered `.md.html` sibling → cancel (don't open the
                            // raw .md). Resolve a `#fragment` via the slug map,
                            // since heading ids are mk-h{index}, not GitHub slugs.
                            if let frag = url.fragment(percentEncoded: false), !frag.isEmpty {
                                let arg = ReaderHTML.javaScriptStringLiteral(frag)
                                webView.evaluateJavaScript(
                                    "window.__markupScrollToSlug && window.__markupScrollToSlug(\(arg));",
                                    completionHandler: nil)
                            }
                            decisionHandler(.cancel, preferences)
                        }
                        return
                    }
                    // A link to a *different* in-repo doc → open it in-app rather
                    // than 404 on a file we never materialized. Carry the link's
                    // `#fragment` along so the opened doc scrolls to the anchor
                    // (the standardized path above drops it).
                    if let root = inRepoRoot, let rel = Self.inRepoDocPath(url, under: root) {
                        onInRepoDoc(rel, url.fragment(percentEncoded: false))
                        decisionHandler(.cancel, preferences)
                        return
                    }
                    // Other local resources (assets etc.) → allow.
                    decisionHandler(.allow, preferences)
                    return
                }
                // A tapped link to an external destination (web / mail / phone)
                // opens in the system handler instead of hijacking the reader.
                if let scheme = url.scheme?.lowercased(),
                   ["http", "https", "mailto", "tel"].contains(scheme) {
                    UIApplication.shared.open(url)
                    decisionHandler(.cancel, preferences)
                    return
                }
            }
            // The initial document load and in-bundle (file://, markupasset://)
            // navigations are `.other`, so they fall through to `.allow`.
            decisionHandler(.allow, preferences)
        }
    }
}
