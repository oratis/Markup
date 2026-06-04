import Foundation

/// A file the user opened from outside the vault (share sheet / Open-in),
/// copied into the app so it stays openable. `id` is a content key (e.g. a
/// hash) used to de-duplicate re-opens of the same file.
public struct RecentEntry: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    /// Original display filename (e.g. "Report.html").
    public var name: String
    /// Filename of the app-owned copy inside the Opened/ directory.
    public var storedName: String
    /// When it was last opened — epoch milliseconds.
    public var addedAt: Double
    public var favorite: Bool

    public init(
        id: String, name: String, storedName: String, addedAt: Double, favorite: Bool = false
    ) {
        self.id = id
        self.name = name
        self.storedName = storedName
        self.addedAt = addedAt
        self.favorite = favorite
    }

    public var ext: String { (name as NSString).pathExtension.lowercased() }
}

/// History of externally-opened files: de-duplicated, favouritable, and
/// persisted as JSON. Pure model (no UIKit) so it's unit-testable; the app
/// owns the file copying and passes a content `id`.
public final class RecentsStore {
    private let fileURL: URL?
    /// Cap on non-favourite entries; favourites are always kept.
    private let limit: Int
    public private(set) var entries: [RecentEntry]

    /// `fileURL == nil` → in-memory only (tests). Otherwise loads/saves JSON.
    public init(fileURL: URL?, limit: Int = 200) {
        self.fileURL = fileURL
        self.limit = limit
        if let fileURL, let data = try? Data(contentsOf: fileURL),
           let decoded = try? JSONDecoder().decode([RecentEntry].self, from: data) {
            entries = decoded
        } else {
            entries = []
        }
    }

    /// Record an open. If `id` already exists, it's moved to the front and its
    /// `addedAt`/`name` refreshed (favourite preserved); otherwise inserted.
    /// Returns the resulting entry.
    @discardableResult
    public func record(
        id: String, name: String, storedName: String, atMs: Double
    ) -> RecentEntry {
        if let i = entries.firstIndex(where: { $0.id == id }) {
            var e = entries.remove(at: i)
            e.addedAt = atMs
            e.name = name
            entries.insert(e, at: 0)
            trimAndSave()
            return e
        }
        let e = RecentEntry(id: id, name: name, storedName: storedName, addedAt: atMs)
        entries.insert(e, at: 0)
        trimAndSave()
        return e
    }

    public func setFavorite(_ id: String, _ on: Bool) {
        guard let i = entries.firstIndex(where: { $0.id == id }) else { return }
        entries[i].favorite = on
        save()
    }

    public func toggleFavorite(_ id: String) {
        guard let i = entries.firstIndex(where: { $0.id == id }) else { return }
        entries[i].favorite.toggle()
        save()
    }

    /// Remove an entry; returns it (so the caller can delete the stored file).
    @discardableResult
    public func remove(_ id: String) -> RecentEntry? {
        guard let i = entries.firstIndex(where: { $0.id == id }) else { return nil }
        let e = entries.remove(at: i)
        save()
        return e
    }

    /// Entries newest-first; `favoritesOnly` filters to starred ones.
    public func list(favoritesOnly: Bool = false) -> [RecentEntry] {
        let base = favoritesOnly ? entries.filter(\.favorite) : entries
        return base.sorted { $0.addedAt > $1.addedAt }
    }

    public var hasFavorites: Bool { entries.contains(where: \.favorite) }

    // MARK: - Internals

    /// Drop oldest non-favourites beyond `limit` (favourites are never trimmed),
    /// then persist. Returns the trimmed-away entries (for file cleanup).
    @discardableResult
    private func trimAndSave() -> [RecentEntry] {
        var trimmed: [RecentEntry] = []
        let nonFav = entries.filter { !$0.favorite }
        if nonFav.count > limit {
            // Oldest non-favourites are the surplus.
            let surplus = nonFav.sorted { $0.addedAt < $1.addedAt }.prefix(nonFav.count - limit)
            let ids = Set(surplus.map(\.id))
            trimmed = entries.filter { ids.contains($0.id) }
            entries.removeAll { ids.contains($0.id) }
        }
        save()
        return trimmed
    }

    private func save() {
        guard let fileURL else { return }
        if let data = try? JSONEncoder().encode(entries) {
            try? data.write(to: fileURL, options: .atomic)
        }
    }
}
