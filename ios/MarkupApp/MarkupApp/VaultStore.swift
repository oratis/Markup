import Foundation
import MarkupKit

/// Owns the chosen vault folder (via a security-scoped bookmark) and the list of
/// `.md` files inside it. M0 scope: open a folder, scan it, load file contents.
@MainActor
@Observable
final class VaultStore {
    var rootURL: URL?
    var files: [VaultFile] = []
    var errorMessage: String?
    var isScanning = false

    /// Search/links/tags/outline index. Built off the scan; nil until ready.
    var index: IndexService?
    var indexReady = false

    private let bookmarkKey = "vault.rootBookmark"
    private let markdownExtensions: Set<String> = ["md", "markdown", "mdx", "mkd"]

    var rootName: String { rootURL?.lastPathComponent ?? "No folder" }

    /// Re-open the previously chosen folder on launch.
    func restore() {
        guard let data = UserDefaults.standard.data(forKey: bookmarkKey) else { return }
        var stale = false
        guard let url = try? URL(
            resolvingBookmarkData: data, bookmarkDataIsStale: &stale) else {
            errorMessage = "Couldn't reopen the saved folder."
            return
        }
        adopt(url, persist: stale) // refresh the bookmark if it went stale
    }

    /// Adopt a folder the user just picked.
    func openFolder(_ url: URL) {
        adopt(url, persist: true)
    }

    private func adopt(_ url: URL, persist: Bool) {
        // Stop accessing any previous root.
        rootURL?.stopAccessingSecurityScopedResource()

        guard url.startAccessingSecurityScopedResource() else {
            errorMessage = "No permission to read that folder."
            return
        }
        rootURL = url

        if persist, let data = try? url.bookmarkData() {
            UserDefaults.standard.set(data, forKey: bookmarkKey)
        }
        scan()
    }

    func scan() {
        guard let root = rootURL else { return }
        isScanning = true
        defer { isScanning = false }

        let fm = FileManager.default
        let keys: [URLResourceKey] = [.contentModificationDateKey, .fileSizeKey, .isRegularFileKey]
        guard let enumerator = fm.enumerator(
            at: root, includingPropertiesForKeys: keys,
            options: [.skipsHiddenFiles, .skipsPackageDescendants]) else {
            files = []
            return
        }

        var found: [VaultFile] = []
        let rootPath = root.standardizedFileURL.path
        for case let url as URL in enumerator {
            guard markdownExtensions.contains(url.pathExtension.lowercased()) else { continue }
            let values = try? url.resourceValues(forKeys: Set(keys))
            if values?.isRegularFile == false { continue }
            let mtime = (values?.contentModificationDate?.timeIntervalSince1970 ?? 0) * 1000
            let size = values?.fileSize ?? 0
            var rel = url.standardizedFileURL.path
            if rel.hasPrefix(rootPath) {
                rel = String(rel.dropFirst(rootPath.count))
                if rel.hasPrefix("/") { rel.removeFirst() }
            }
            found.append(VaultFile(
                path: url.path, relPath: rel, name: url.lastPathComponent,
                mtimeMs: mtime, size: size))
        }
        files = found.sorted { $0.relPath.localizedCaseInsensitiveCompare($1.relPath) == .orderedAscending }
        rebuildIndex()
    }

    /// Look up a scanned file by its vault-relative path (search/result mapping).
    func file(forRelPath relPath: String) -> VaultFile? {
        files.first { $0.relPath == relPath }
    }

    /// Rebuild the SQLite index from the current file list. Yields periodically
    /// so a large vault doesn't freeze the UI.
    private func rebuildIndex() {
        let snapshot = files
        indexReady = false
        Task { @MainActor in
            guard let idx = try? IndexService() else { return }
            var n = 0
            for f in snapshot {
                if let content = try? String(contentsOfFile: f.path, encoding: .utf8) {
                    try? idx.index(
                        relPath: f.relPath, name: f.name, content: content,
                        mtimeMs: f.mtimeMs, size: f.size)
                }
                n += 1
                if n % 50 == 0 { await Task.yield() }
            }
            self.index = idx
            self.indexReady = true
        }
    }

    /// Read a file's text content, or `nil` on failure.
    func content(of file: VaultFile) -> String? {
        try? String(contentsOf: URL(fileURLWithPath: file.path), encoding: .utf8)
    }

    /// Write text back to a file (atomic). Returns whether it succeeded.
    @discardableResult
    func write(_ content: String, to file: VaultFile) -> Bool {
        do {
            try content.write(
                to: URL(fileURLWithPath: file.path), atomically: true, encoding: .utf8)
            return true
        } catch {
            errorMessage = "Couldn't save \(file.name)."
            return false
        }
    }
}
