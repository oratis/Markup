import SwiftUI
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
        let key = (fileURL.map { "file:" + $0.path } ?? html) + "#\(loadToken)"
        if context.coordinator.lastHTML != key {
            context.coordinator.lastHTML = key
            if let fileURL {
                webView.loadFileURL(
                    fileURL, allowingReadAccessTo: readAccessURL ?? fileURL.deletingLastPathComponent())
            } else {
                webView.loadHTMLString(html, baseURL: baseURL)
            }
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

        init(onScroll: @escaping (Double) -> Void, onToggleTask: @escaping (Int) -> Void) {
            self.onScroll = onScroll
            self.onToggleTask = onToggleTask
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
            decisionHandler(.allow, preferences)
        }
    }
}
