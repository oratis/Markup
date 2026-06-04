import Foundation

/// Pure helpers for choosing vault filenames.
public enum VaultNaming {
    /// A filename that doesn't collide (case-insensitively) with `existing`,
    /// trying `base.ext`, then `base 2.ext`, `base 3.ext`, …
    public static func uniqueName(base: String, ext: String, existing: Set<String>) -> String {
        let taken = Set(existing.map { $0.lowercased() })
        func candidate(_ n: Int) -> String { n <= 1 ? "\(base).\(ext)" : "\(base) \(n).\(ext)" }
        var n = 1
        while taken.contains(candidate(n).lowercased()) { n += 1 }
        return candidate(n)
    }
}
