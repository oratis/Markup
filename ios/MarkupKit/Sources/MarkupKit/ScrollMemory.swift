import Foundation

/// Remembers a per-document reading position as a 0…1 scroll fraction.
/// Pure value type; the app persists `storage` to UserDefaults.
public struct ScrollMemory: Equatable, Sendable {
    private var positions: [String: Double]

    public init(_ positions: [String: Double] = [:]) {
        self.positions = positions.mapValues { Self.clamp($0) }
    }

    /// Saved fraction for a vault-relative path (0 when unseen).
    public func position(for path: String) -> Double { positions[path] ?? 0 }

    /// Record a fraction (clamped to 0…1). A fraction of 0 forgets the entry to
    /// keep storage small.
    public mutating func set(_ fraction: Double, for path: String) {
        let v = Self.clamp(fraction)
        if v == 0 { positions[path] = nil } else { positions[path] = v }
    }

    /// Drop the entry for a path (e.g. when the file is deleted).
    public mutating func forget(_ path: String) { positions[path] = nil }

    /// Backing dictionary for persistence.
    public var storage: [String: Double] { positions }

    private static func clamp(_ v: Double) -> Double { min(1, max(0, v)) }
}
