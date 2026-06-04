import Foundation
import Testing
@testable import MarkupKit

@Suite("RecentsStore")
struct RecentsStoreTests {
    @Test func recordsNewestFirst() {
        let s = RecentsStore(fileURL: nil)
        s.record(id: "a", name: "A.md", storedName: "a.md", atMs: 1)
        s.record(id: "b", name: "B.md", storedName: "b.md", atMs: 2)
        #expect(s.list().map(\.id) == ["b", "a"])
    }

    @Test func dedupsByIdAndBumps() {
        let s = RecentsStore(fileURL: nil)
        s.record(id: "a", name: "A.md", storedName: "a.md", atMs: 1)
        s.record(id: "b", name: "B.md", storedName: "b.md", atMs: 2)
        // Re-open "a" → moves to front, count unchanged.
        s.record(id: "a", name: "A.md", storedName: "a.md", atMs: 3)
        #expect(s.entries.count == 2)
        #expect(s.list().first?.id == "a")
    }

    @Test func favoriteIsPreservedAcrossReopen() {
        let s = RecentsStore(fileURL: nil)
        s.record(id: "a", name: "A.md", storedName: "a.md", atMs: 1)
        s.setFavorite("a", true)
        s.record(id: "a", name: "A.md", storedName: "a.md", atMs: 5)
        #expect(s.list().first?.favorite == true)
        #expect(s.list(favoritesOnly: true).map(\.id) == ["a"])
    }

    @Test func removeReturnsEntry() {
        let s = RecentsStore(fileURL: nil)
        s.record(id: "a", name: "A.md", storedName: "a.md", atMs: 1)
        let removed = s.remove("a")
        #expect(removed?.storedName == "a.md")
        #expect(s.entries.isEmpty)
    }

    @Test func trimsNonFavoritesPastLimitButKeepsFavorites() {
        let s = RecentsStore(fileURL: nil, limit: 3)
        // Fill to the limit, then favourite the oldest while it's still present.
        s.record(id: "0", name: "n0", storedName: "n0", atMs: 0)
        s.record(id: "1", name: "n1", storedName: "n1", atMs: 1)
        s.record(id: "2", name: "n2", storedName: "n2", atMs: 2)
        s.setFavorite("0", true)
        // Now push past the limit — favourite "0" must survive despite being oldest.
        s.record(id: "3", name: "n3", storedName: "n3", atMs: 3)
        s.record(id: "4", name: "n4", storedName: "n4", atMs: 4)
        s.record(id: "5", name: "n5", storedName: "n5", atMs: 5)
        let ids = Set(s.entries.map(\.id))
        #expect(ids.contains("0")) // favourite kept despite being oldest
        #expect(s.entries.filter { !$0.favorite }.count <= 3)
    }

    @Test func persistsAndReloadsFromDisk() throws {
        let tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("recents-\(UUID().uuidString).json")
        defer { try? FileManager.default.removeItem(at: tmp) }
        let s1 = RecentsStore(fileURL: tmp)
        s1.record(id: "a", name: "A.md", storedName: "a.md", atMs: 1)
        s1.setFavorite("a", true)

        let s2 = RecentsStore(fileURL: tmp)
        #expect(s2.list().map(\.id) == ["a"])
        #expect(s2.list().first?.favorite == true)
    }
}
