import SwiftUI
import MarkupKit

/// Reads a single file opened from another app ("Open in Markup") — a `.md`
/// rendered as a page, a `.html` shown directly, or a `.zip` web bundle
/// (index.html + assets) unpacked and rendered. Handles security-scoped
/// access and on-demand iCloud download.
struct ExternalFileReader: View {
    let url: URL

    @Environment(\.dismiss) private var dismiss
    @State private var content: String?
    @State private var failed = false
    /// Entry point + extraction root for an opened `.zip` web bundle.
    @State private var bundleEntry: URL?
    @State private var bundleRoot: URL?
    /// Scripts in shared HTML / bundles are off until the user opts in.
    @State private var htmlJSEnabled = false
    @State private var htmlDesktopMode = false
    @State private var htmlReloadToken = 0
    @AppStorage("reader.theme") private var themeRaw = ReaderTheme.light.rawValue

    private var theme: ReaderTheme { ReaderTheme(rawValue: themeRaw) ?? .light }
    private var ext: String { url.pathExtension.lowercased() }
    private var isHTML: Bool { ext == "html" || ext == "htm" }
    private var isZip: Bool { ext == "zip" }
    /// HTML-style controls (scripts/desktop toggles) apply to raw HTML and to
    /// rendered web bundles.
    private var showHTMLControls: Bool { bundleEntry != nil || (isHTML && content != nil) }

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
                if let bundleEntry {
                    ReaderWebView(
                        fileURL: bundleEntry, readAccessURL: bundleRoot,
                        loadToken: htmlReloadToken,
                        javaScriptEnabled: htmlJSEnabled, preferDesktop: htmlDesktopMode)
                } else if content != nil {
                    ReaderWebView(
                        html: docHTML, baseURL: url.deletingLastPathComponent(),
                        loadToken: htmlReloadToken,
                        javaScriptEnabled: isHTML ? htmlJSEnabled : true,
                        preferDesktop: isHTML && htmlDesktopMode)
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
                if showHTMLControls {
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Button {
                            htmlDesktopMode.toggle()
                            htmlReloadToken += 1
                        } label: {
                            Image(systemName: htmlDesktopMode ? "desktopcomputer" : "iphone")
                        }
                        .accessibilityLabel(htmlDesktopMode ? t(.mobileMode) : t(.desktopMode))
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
            if isZip {
                if let data = try? Data(contentsOf: url) {
                    if let bundle = extractBundle(data) {
                        bundleRoot = bundle.root
                        bundleEntry = bundle.entry
                        RecentsService.shared.ingest(url)
                    } else {
                        failed = true
                    }
                    return
                }
            } else if let text = try? String(contentsOf: url, encoding: .utf8) {
                content = text
                RecentsService.shared.ingest(url)
                return
            }
            try? await Task.sleep(nanoseconds: 300_000_000)
        }
        failed = true
    }

    /// Unpack a `.zip` web bundle into a temp dir and return its entry HTML.
    private func extractBundle(_ data: Data) -> (entry: URL, root: URL)? {
        let entries = ZipArchive.extract(data)
        guard let entryPath = ZipArchive.entryHTML(entries.map(\.path)) else { return nil }
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("bundle-\(UUID().uuidString)", isDirectory: true)
        let rootPath = root.standardizedFileURL.path
        for e in entries {
            let dest = root.appendingPathComponent(e.path).standardizedFileURL
            // Guard against zip path traversal (../ escaping the temp root).
            guard dest.path.hasPrefix(rootPath) else { continue }
            try? FileManager.default.createDirectory(
                at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? e.data.write(to: dest)
        }
        return (root.appendingPathComponent(entryPath), root)
    }
}
