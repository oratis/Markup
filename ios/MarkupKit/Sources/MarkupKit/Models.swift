import Foundation

// Core data shapes, mirroring the desktop app's `src/lib/types.ts`.
// Kept as plain value types so they cross actor boundaries freely (`Sendable`).

/// A file in the vault as surfaced by a scan. `path` is the location we can
/// open (resolved from a security-scoped bookmark on iOS); `relPath` is the
/// vault-relative path used as a stable identity and for link resolution.
public struct VaultFile: Equatable, Hashable, Sendable, Identifiable {
    public var path: String
    public var relPath: String
    public var name: String
    public var mtimeMs: Double
    public var size: Int

    public var id: String { relPath }

    public init(path: String, relPath: String, name: String, mtimeMs: Double, size: Int) {
        self.path = path
        self.relPath = relPath
        self.name = name
        self.mtimeMs = mtimeMs
        self.size = size
    }
}

/// A loaded document: its content plus the on-disk mtime captured at load
/// time, used for the save-time conflict ("mtime guard") check.
public struct LoadedFile: Equatable, Sendable {
    public var path: String
    public var content: String
    public var mtimeMs: Double

    public init(path: String, content: String, mtimeMs: Double) {
        self.path = path
        self.content = content
        self.mtimeMs = mtimeMs
    }
}

/// A full-text search result row.
/// A note that links to the current one, with the line of context the link
/// appears on.
public struct BacklinkHit: Equatable, Sendable, Identifiable {
    public var source: String
    public var context: String
    public var id: String { source + "\u{1}" + context }
    public init(source: String, context: String) {
        self.source = source
        self.context = context
    }
}

public struct SearchHit: Equatable, Sendable, Identifiable {
    public var path: String
    public var title: String
    public var mtimeMs: Double
    public var score: Double
    /// A short body excerpt around the match, with matched terms wrapped in
    /// `«…»` markers. Empty for non-text (recency) listings.
    public var snippet: String

    public var id: String { path }

    public init(
        path: String, title: String, mtimeMs: Double, score: Double, snippet: String = ""
    ) {
        self.path = path
        self.title = title
        self.mtimeMs = mtimeMs
        self.score = score
        self.snippet = snippet
    }
}
