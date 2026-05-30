import Foundation
import MarkupKit

/// Persists per-document reading positions (0…1 scroll fraction) to
/// UserDefaults, backed by the pure `ScrollMemory` value type.
@MainActor
final class ReadingPositionStore {
    static let shared = ReadingPositionStore()

    private let key = "reader.scrollMemory"
    private var memory: ScrollMemory

    init() {
        let dict = (UserDefaults.standard.dictionary(forKey: key) as? [String: Double]) ?? [:]
        memory = ScrollMemory(dict)
    }

    func position(for path: String) -> Double { memory.position(for: path) }

    func save(_ fraction: Double, for path: String) {
        memory.set(fraction, for: path)
        UserDefaults.standard.set(memory.storage, forKey: key)
    }
}
