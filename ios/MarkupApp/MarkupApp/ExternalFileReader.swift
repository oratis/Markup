import SwiftUI
import MarkupKit

/// A repo doc to push when an in-repo link is tapped while reading a GitHub
/// working copy. Hashable so it can drive a `NavigationStack` path. `fragment`
/// is the tapped link's `#anchor` (e.g. `post-users`), if any, so the pushed
/// doc scrolls to that heading once loaded.
struct InRepoTarget: Hashable {
    let fileURL: URL
    let root: URL
    let link: GitHubLink
    var fragment: String? = nil
}

/// Sheet host for an externally opened doc. Wraps the reader content in a
/// navigation stack so in-repo links (inside a GitHub working copy) push deeper
/// repo docs in place, with a normal back button.
struct ExternalFileReader: View {
    let url: URL
    var readAccessRoot: URL? = nil
    /// Repo context for the root doc — present only for GitHub working copies.
    var sourceLink: GitHubLink? = nil

    @State private var path: [InRepoTarget] = []

    var body: some View {
        NavigationStack(path: $path) {
            ReaderContent(
                url: url, readAccessRoot: readAccessRoot, sourceLink: sourceLink,
                isRoot: true, onPushDoc: { path.append($0) })
            .navigationDestination(for: InRepoTarget.self) { target in
                ReaderContent(
                    url: target.fileURL, readAccessRoot: target.root, sourceLink: target.link,
                    isRoot: false, fragment: target.fragment, onPushDoc: { path.append($0) })
            }
        }
    }
}

/// Reads a single file — a `.md` rendered as a page, a `.html` shown directly,
/// or a `.zip` web bundle (index.html + assets) unpacked and rendered. Handles
/// security-scoped access and on-demand iCloud download. For a GitHub working
/// copy (`readAccessRoot` + `sourceLink` set) it loads from disk so relative
/// assets resolve, and intercepts in-repo doc links to open them in-app.
struct ReaderContent: View {
    let url: URL
    var readAccessRoot: URL? = nil
    var sourceLink: GitHubLink? = nil
    var isRoot: Bool = true
    /// A `#fragment` (e.g. `post-users`) to scroll to once this doc loads — set
    /// when the doc was opened by tapping an in-repo `doc.md#anchor` link.
    var fragment: String? = nil
    var onPushDoc: (InRepoTarget) -> Void = { _ in }

    @Environment(\.dismiss) private var dismiss
    /// Drives the reader's WebView so we can scroll to `fragment` after load.
    @StateObject private var readerProxy = WebViewProxy()
    @State private var content: String?
    @State private var failed = false
    /// Entry point + extraction root for an opened `.zip` web bundle.
    @State private var bundleEntry: URL?
    @State private var bundleRoot: URL?
    /// Entry HTML to load from disk for a working-copy doc (the file itself for
    /// HTML, or a rendered-Markdown sibling for `.md`).
    @State private var workingCopyEntry: URL?
    /// True while downloading a tapped in-repo doc before pushing it.
    @State private var openingInRepo = false
    /// Set when opening a tapped in-repo doc fails (offline / 404 / rate limit).
    @State private var inRepoError: String?
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
    /// Intercept in-repo links only when we can re-materialize them.
    private var inRepoRoot: URL? { sourceLink != nil ? readAccessRoot : nil }

    private var docHTML: String {
        guard let content else { return "" }
        if isHTML { return content }
        return ReaderHTML.document(
            markdown: content, title: url.lastPathComponent, theme: theme,
            assetBase: readerAssetBase)
    }

    var body: some View {
        Group {
            if let bundleEntry {
                ReaderWebView(
                    fileURL: bundleEntry, readAccessURL: bundleRoot,
                    loadToken: htmlReloadToken,
                    javaScriptEnabled: htmlJSEnabled, preferDesktop: htmlDesktopMode)
            } else if let workingCopyEntry {
                // GitHub working copy: load from disk so relative assets
                // resolve. Our own Markdown render is trusted (JS on); raw
                // repo HTML keeps the opt-in script toggle.
                ReaderWebView(
                    fileURL: workingCopyEntry, readAccessURL: readAccessRoot,
                    loadToken: htmlReloadToken,
                    javaScriptEnabled: isHTML ? htmlJSEnabled : true,
                    preferDesktop: isHTML && htmlDesktopMode,
                    inRepoRoot: inRepoRoot, onInRepoDoc: openInRepo,
                    onFinishLoad: scrollToFragment, proxy: readerProxy)
            } else if content != nil {
                ReaderWebView(
                    html: docHTML, baseURL: url.deletingLastPathComponent(),
                    loadToken: htmlReloadToken,
                    javaScriptEnabled: isHTML ? htmlJSEnabled : true,
                    preferDesktop: isHTML && htmlDesktopMode,
                    onFinishLoad: scrollToFragment, proxy: readerProxy)
            } else if failed {
                ContentUnavailableView(
                    "Couldn't open file", systemImage: "exclamationmark.triangle",
                    description: Text(url.lastPathComponent))
            } else {
                ProgressView("Opening…")
            }
        }
        .overlay {
            if openingInRepo {
                ProgressView().controlSize(.large)
                    .padding(24)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
            }
        }
        .ignoresSafeArea(edges: .bottom)
        .navigationTitle(url.lastPathComponent)
        .navigationBarTitleDisplayMode(.inline)
        .alert("Couldn't open link", isPresented: Binding(
            get: { inRepoError != nil }, set: { if !$0 { inRepoError = nil } })) {
            Button(t(.ok), role: .cancel) { inRepoError = nil }
        } message: {
            Text(inRepoError ?? "")
        }
        .toolbar {
            if isRoot {
                ToolbarItem(placement: .cancellationAction) { Button(t(.done)) { dismiss() } }
            }
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

    /// Download a tapped in-repo doc (same owner/repo/ref, new path) and push it,
    /// carrying the link's `#fragment` so the pushed doc scrolls to that anchor.
    /// Surfaces failures (offline, 404 on a broken link, rate limit) instead of
    /// silently clearing the spinner with nothing opened.
    private func openInRepo(_ repoPath: String, _ fragment: String?) {
        guard let sourceLink, !openingInRepo else { return }
        openingInRepo = true
        Task {
            defer { openingInRepo = false }
            let link = GitHubLink(
                owner: sourceLink.owner, repo: sourceLink.repo, ref: sourceLink.ref,
                path: repoPath, isDirectory: false)
            do {
                let doc = try await GitHubService.shared.openFile(link)
                onPushDoc(InRepoTarget(
                    fileURL: doc.fileURL, root: doc.root, link: doc.link, fragment: fragment))
            } catch {
                inRepoError = error.localizedDescription
            }
        }
    }

    /// After the doc finishes loading, scroll to the pending `#fragment` anchor
    /// (a no-op when none was requested, or on a doc without the slug hook).
    private func scrollToFragment() {
        guard let fragment, !fragment.isEmpty else { return }
        readerProxy.scrollToSlug(fragment)
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
                if readAccessRoot != nil { workingCopyEntry = makeWorkingCopyEntry(text) }
                return
            }
            try? await Task.sleep(nanoseconds: 300_000_000)
        }
        failed = true
    }

    /// Build the on-disk entry HTML for a working-copy doc. HTML loads directly;
    /// Markdown is rendered to a sibling `.html` (same directory, so the relative
    /// asset paths in the doc resolve against the mirrored working copy). Returns
    /// `nil` on write failure → the caller falls back to the in-memory render.
    private func makeWorkingCopyEntry(_ text: String) -> URL? {
        if isHTML { return url }
        let html = ReaderHTML.document(
            markdown: text, title: url.lastPathComponent, theme: theme, assetBase: readerAssetBase)
        guard let data = html.data(using: .utf8) else { return nil }
        let entry = url.appendingPathExtension("html")
        do { try data.write(to: entry, options: .atomic) } catch { return nil }
        return entry
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
            // Guard against zip path traversal (../ escaping the temp root). The
            // trailing "/" prevents a sibling dir whose name extends the root.
            guard dest.path.hasPrefix(rootPath + "/") else { continue }
            try? FileManager.default.createDirectory(
                at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? e.data.write(to: dest)
        }
        return (root.appendingPathComponent(entryPath), root)
    }
}
