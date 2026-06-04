import SwiftUI
import MarkupKit

/// Reads a single file opened from another app ("Open in Markup") — a `.md`
/// rendered as a page, or a `.html` shown directly. Handles security-scoped
/// access and on-demand iCloud download.
struct ExternalFileReader: View {
    let url: URL

    @Environment(\.dismiss) private var dismiss
    @State private var content: String?
    @State private var failed = false
    /// Scripts in a shared `.html` file are off until the user opts in.
    @State private var htmlJSEnabled = false
    @State private var htmlReloadToken = 0
    @AppStorage("reader.theme") private var themeRaw = ReaderTheme.light.rawValue

    private var theme: ReaderTheme { ReaderTheme(rawValue: themeRaw) ?? .light }
    private var isHTML: Bool {
        ["html", "htm"].contains(url.pathExtension.lowercased())
    }

    private var docHTML: String {
        guard let content else { return "" }
        if isHTML { return content }
        return ReaderHTML.document(
            markdown: content, title: url.lastPathComponent, theme: theme,
            assetBase: readerAssetBase)
    }

    var body: some View {
        NavigationStack {
            Group {
                if content != nil {
                    ReaderWebView(
                        html: docHTML, baseURL: url.deletingLastPathComponent(),
                        loadToken: htmlReloadToken,
                        javaScriptEnabled: isHTML ? htmlJSEnabled : true)
                } else if failed {
                    ContentUnavailableView(
                        "Couldn't open file", systemImage: "exclamationmark.triangle",
                        description: Text(url.lastPathComponent))
                } else {
                    ProgressView("Opening…")
                }
            }
            .ignoresSafeArea(edges: .bottom)
            .navigationTitle(url.lastPathComponent)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(t(.done)) { dismiss() } }
                if isHTML && content != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            htmlJSEnabled.toggle()
                            htmlReloadToken += 1
                        } label: {
                            Image(systemName: htmlJSEnabled ? "bolt.fill" : "bolt.slash")
                        }
                        .accessibilityLabel(htmlJSEnabled ? t(.disableScripts) : t(.enableScripts))
                    }
                }
            }
            .task { await load() }
        }
    }

    private func load() async {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }

        // Kick off an iCloud download if this is a not-yet-downloaded item.
        try? FileManager.default.startDownloadingUbiquitousItem(at: url)

        for _ in 0..<12 {
            if let text = try? String(contentsOf: url, encoding: .utf8) {
                content = text
                return
            }
            try? await Task.sleep(nanoseconds: 300_000_000)
        }
        failed = true
    }
}
