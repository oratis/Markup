import SwiftUI
import UIKit
import WebKit
import MarkupKit

/// Produces shareable files (themed HTML, PDF, raw Markdown) for the share sheet.
enum ShareService {
    private static func tempURL(_ title: String, _ ext: String) -> URL {
        let base = slugifyForFilename(title)
        let name = (base.isEmpty ? "note" : base) + "." + ext
        return FileManager.default.temporaryDirectory.appendingPathComponent(name)
    }

    /// A self-contained themed `.html` of the note. Returns the file URL.
    static func writeHTML(content: String, title: String, theme: ReaderTheme) -> URL? {
        let html = ReaderHTML.document(markdown: content, title: title, theme: theme)
        let url = tempURL(title, "html")
        return (try? html.write(to: url, atomically: true, encoding: .utf8)) != nil ? url : nil
    }

    /// The raw Markdown as a `.md` file.
    static func writeMarkdown(content: String, title: String) -> URL? {
        let url = tempURL(title, "md")
        return (try? content.write(to: url, atomically: true, encoding: .utf8)) != nil ? url : nil
    }
}

/// Renders a note's HTML in an offscreen WebView and exports it to a PDF file.
/// Held alive by the caller (a @State reference) for the duration of the async
/// render.
@MainActor
final class PDFExporter: NSObject, WKNavigationDelegate {
    private var webView: WKWebView?
    private var completion: ((URL?) -> Void)?
    private let title: String

    init(title: String) { self.title = title }

    func export(content: String, theme: ReaderTheme, completion: @escaping (URL?) -> Void) {
        self.completion = completion
        let html = ReaderHTML.document(markdown: content, title: title, theme: theme)
        let wv = WKWebView(frame: CGRect(x: 0, y: 0, width: 612, height: 792))
        wv.navigationDelegate = self
        webView = wv
        wv.loadHTMLString(html, baseURL: nil)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Give KaTeX/Mermaid a moment to settle, then snapshot to PDF.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
            guard let self else { return }
            webView.createPDF(configuration: WKPDFConfiguration()) { result in
                switch result {
                case .success(let data):
                    let base = slugifyForFilename(self.title)
                    let url = FileManager.default.temporaryDirectory
                        .appendingPathComponent((base.isEmpty ? "note" : base) + ".pdf")
                    try? data.write(to: url)
                    self.completion?(url)
                case .failure:
                    self.completion?(nil)
                }
                self.webView = nil
            }
        }
    }
}

/// Wraps `UIActivityViewController` (the system share sheet).
struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

/// Identifiable URL wrapper so it can drive `.sheet(item:)`.
struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}
