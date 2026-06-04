import CryptoKit
import Foundation
import MarkupKit

/// Owns the history of externally-opened files: copies each opened file into
/// the app's container (so it stays openable after the share-scope ends),
/// de-duplicates by content hash, and persists the list via `RecentsStore`.
@MainActor
final class RecentsService {
    static let shared = RecentsService()

    let store: RecentsStore
    private let openedDir: URL

    init() {
        let fm = FileManager.default
        let support = (fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fm.temporaryDirectory)
        try? fm.createDirectory(at: support, withIntermediateDirectories: true)
        openedDir = support.appendingPathComponent("Opened", isDirectory: true)
        try? fm.createDirectory(at: openedDir, withIntermediateDirectories: true)
        store = RecentsStore(fileURL: support.appendingPathComponent("recents.json"))
    }

    /// The app-owned copy for a history entry.
    func url(for entry: RecentEntry) -> URL {
        openedDir.appendingPathComponent(entry.storedName)
    }

    /// Copy an externally-opened file into the app and record it in history.
    /// De-dupes by content hash, so re-opening the same file just bumps it.
    /// Safe to call with an already-app-owned URL (idempotent).
    @discardableResult
    func ingest(_ external: URL) -> RecentEntry? {
        let scoped = external.startAccessingSecurityScopedResource()
        defer { if scoped { external.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: external) else { return nil }

        let id = Self.hash(data)
        let ext = external.pathExtension.lowercased()
        let storedName = ext.isEmpty ? id : "\(id).\(ext)"
        let dest = openedDir.appendingPathComponent(storedName)
        if !FileManager.default.fileExists(atPath: dest.path) {
            try? data.write(to: dest, options: .atomic)
        }
        let nowMs = Date().timeIntervalSince1970 * 1000
        return store.record(
            id: id, name: external.lastPathComponent, storedName: storedName, atMs: nowMs)
    }

    func delete(_ entry: RecentEntry) {
        if let removed = store.remove(entry.id) {
            try? FileManager.default.removeItem(at: url(for: removed))
        }
    }

    private static func hash(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
}
