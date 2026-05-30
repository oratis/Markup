import SwiftUI
import WebKit

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
    let html: String
    let baseURL: URL?
    var proxy: WebViewProxy? = nil
    var onScroll: (Double) -> Void = { _ in }
    var onToggleTask: (Int) -> Void = { _ in }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "scroll")
        controller.add(context.coordinator, name: "task")
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
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
        if context.coordinator.lastHTML != html {
            context.coordinator.lastHTML = html
            webView.loadHTMLString(html, baseURL: baseURL)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onScroll: onScroll, onToggleTask: onToggleTask)
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        var lastHTML: String?
        var onScroll: (Double) -> Void
        var onToggleTask: (Int) -> Void

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
    }
}
