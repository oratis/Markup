import SwiftUI
import WebKit

/// Displays rendered HTML in a `WKWebView` and bridges two messages back from
/// the page: scroll position (for reading-position memory) and task-list taps.
struct ReaderWebView: UIViewRepresentable {
    let html: String
    let baseURL: URL?
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
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
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
