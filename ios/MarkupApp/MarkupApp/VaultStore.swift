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
    /// Progress of the current index build (for the "Indexing N notes…" UI).
    var indexedCount = 0
    var indexTotal = 0

    /// A short label for the in-progress index build.
    var indexProgressLabel: String {
        indexTotal > 0 ? "Indexing \(indexedCount) of \(indexTotal)…" : "Indexing…"
    }

    private let bookmarkKey = "vault.rootBookmark"
    private let listableExtensions = markupListableExtensions

    var rootName: String { rootURL?.lastPathComponent ?? "No folder" }

    /// A readable, `/`-joined path for the open vault, cleaning the iCloud
    /// container prefix (e.g. "iCloud Drive/Workspace/Notes").
    var rootDisplayPath: String {
        guard let url = rootURL else { return "" }
        let p = url.path
        if let r = p.range(of: "com~apple~CloudDocs/") {
            return "iCloud Drive/" + String(p[r.upperBound...])
        }
        if let r = p.range(of: "/Mobile Documents/") {
            return String(p[r.upperBound...])
        }
        return url.pathComponents.filter { $0 != "/" }.joined(separator: "/")
    }

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
            guard listableExtensions.contains(url.pathExtension.lowercased()) else { continue }
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
        indexedCount = 0
        indexTotal = snapshot.count
        Task { @MainActor in
            guard let idx = try? IndexService() else { return }
            var n = 0
            for f in snapshot {
                // Canvas files are listed but never body-indexed (opaque JSON).
                if FileKind.of(f.name) == .canvas { n += 1; continue }
                if let raw = try? String(contentsOfFile: f.path, encoding: .utf8) {
                    if FileKind.of(f.name) == .html {
                        // Index HTML by its visible text + <title> so it's searchable.
                        try? idx.index(
                            relPath: f.relPath, name: f.name, content: HTMLDoc.plainText(raw),
                            mtimeMs: f.mtimeMs, size: f.size, title: HTMLDoc.title(raw))
                    } else {
                        try? idx.index(
                            relPath: f.relPath, name: f.name, content: raw,
                            mtimeMs: f.mtimeMs, size: f.size)
                    }
                }
                n += 1
                if n % 50 == 0 {
                    self.indexedCount = n
                    await Task.yield()
                }
            }
            self.indexedCount = n
            self.index = idx
            self.indexReady = true
        }
    }

    /// Read a file's text content, or `nil` on failure. If the file is an
    /// iCloud placeholder that isn't downloaded yet, trigger a download and
    /// wait briefly (the synced-vault "open the Mac's files" path).
    func content(of file: VaultFile) -> String? {
        let url = URL(fileURLWithPath: file.path)
        if let text = try? String(contentsOf: url, encoding: .utf8) { return text }
        try? FileManager.default.startDownloadingUbiquitousItem(at: url)
        let deadline = Date().addingTimeInterval(2.5)
        while Date() < deadline {
            if let text = try? String(contentsOf: url, encoding: .utf8) { return text }
            Thread.sleep(forTimeInterval: 0.15)
        }
        return nil
    }

    /// Current on-disk modification time in ms (for the save-time conflict guard).
    func modificationDateMs(of file: VaultFile) -> Double? {
        let attrs = try? FileManager.default.attributesOfItem(atPath: file.path)
        guard let date = attrs?[.modificationDate] as? Date else { return nil }
        return date.timeIntervalSince1970 * 1000
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

    /// Save image `data` into the vault's `assets/` folder under a unique name
    /// and return the vault-relative path (e.g. `assets/img-1a2b3c4d.png`) for
    /// a Markdown `![](…)` reference, or `nil` on failure.
    func writeAsset(_ data: Data, ext: String) -> String? {
        guard let root = rootURL else { return nil }
        let assets = root.appendingPathComponent("assets", isDirectory: true)
        do {
            try FileManager.default.createDirectory(
                at: assets, withIntermediateDirectories: true)
            let safeExt = ext.isEmpty ? "png" : ext.lowercased()
            let name = "img-\(UUID().uuidString.prefix(8)).\(safeExt)"
            try data.write(to: assets.appendingPathComponent(name), options: .atomic)
            scan() // surface the new asset in the index/listing
            return "assets/\(name)"
        } catch {
            errorMessage = "Couldn't save image."
            return nil
        }
    }

    /// Create a new empty Markdown note at the vault root (collision-safe name),
    /// rescan, and return it. Returns nil if no vault is open or the write fails.
    func createNote() -> VaultFile? {
        guard let root = rootURL else { return nil }
        let name = VaultNaming.uniqueName(
            base: "Untitled", ext: "md", existing: Set(files.map(\.name)))
        let dest = root.appendingPathComponent(name)
        do {
            try "".write(to: dest, atomically: true, encoding: .utf8)
        } catch {
            errorMessage = "Couldn't create note."
            return nil
        }
        scan()
        return files.first { $0.relPath == name } ?? files.first { $0.name == name }
    }

    /// Rename a vault file (within its folder), keeping its extension unless the
    /// user typed one. Collision-safe. Returns the renamed file, or nil.
    @discardableResult
    func rename(_ file: VaultFile, toBase base: String) -> VaultFile? {
        let newName = VaultNaming.renamed(file.name, toBase: base)
        guard newName != file.name else { return file }
        let others = Set(files.map(\.name).filter { $0 != file.name })
        let stem = (newName as NSString).deletingPathExtension
        let ext = (newName as NSString).pathExtension
        let unique = VaultNaming.uniqueName(base: stem, ext: ext, existing: others)
        let src = URL(fileURLWithPath: file.path)
        let dest = src.deletingLastPathComponent().appendingPathComponent(unique)
        do {
            try FileManager.default.moveItem(at: src, to: dest)
        } catch {
            errorMessage = "Couldn't rename \(file.name)."
            return nil
        }
        scan()
        return files.first { $0.path == dest.path } ?? files.first { $0.name == unique }
    }

    /// Delete a vault file from disk and rescan. Returns whether it succeeded.
    @discardableResult
    func delete(_ file: VaultFile) -> Bool {
        do {
            try FileManager.default.removeItem(atPath: file.path)
            scan()
            return true
        } catch {
            errorMessage = "Couldn't delete \(file.name)."
            return false
        }
    }
}
