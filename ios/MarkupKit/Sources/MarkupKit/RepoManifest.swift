import Foundation

/// One file (a git "blob") in a repo tree: its repo-relative path, content SHA,
/// and byte size. Derived from the GitHub git-trees API.
public struct RepoBlob: Codable, Equatable, Sendable {
    /// Repo-relative path, e.g. "docs/guide.md".
    public let path: String
    /// Git blob SHA — content-addressed, so an unchanged file keeps the same SHA
    /// across commits and a changed one differs. This is what the diff compares.
    public let sha: String
    /// Byte size (0 when the API omits it).
    public let size: Int

    public init(path: String, sha: String, size: Int) {
        self.path = path
        self.sha = sha
        self.size = size
    }
}

/// A content-addressed snapshot of a repo's files at one tree SHA: a map of
/// repo-relative path → blob (SHA + size). Built from the GitHub git-trees API
/// (`GET /repos/{o}/{r}/git/trees/{sha}?recursive=1`) and persisted alongside a
/// materialized GitHub vault so a later refresh can `diff` against it and fetch
/// only what changed instead of re-downloading the whole zipball
/// (design `docs/design/ios/03-github-primary-vault.md` §5, §17 "incremental refresh").
///
/// Pure (no I/O): the network call lives in the app's `GitHubService`; this is
/// the parse + diff logic, fully unit-tested.
public struct RepoManifest: Codable, Equatable, Sendable {
    /// The tree SHA this manifest was built from (the recursive tree root).
    public let treeSha: String
    /// True when GitHub truncated the recursive tree (a very large repo). The
    /// manifest is then incomplete, so a diff would wrongly mark the dropped
    /// files as "removed" — the caller must fall back to a full (zipball)
    /// download rather than trust the diff.
    public let truncated: Bool
    /// path → blob, files only. Directory ("tree") and submodule ("commit")
    /// entries are excluded — they have no bytes to download.
    public let blobs: [String: RepoBlob]

    public init(treeSha: String, truncated: Bool = false, blobs: [String: RepoBlob]) {
        self.treeSha = treeSha
        self.truncated = truncated
        self.blobs = blobs
    }

    /// All blob paths, sorted (stable for tests / display).
    public var paths: [String] { blobs.keys.sorted() }

    /// Build a manifest from a git-trees API JSON response. Returns `nil` for
    /// malformed JSON. Keeps only `type == "blob"` entries (skips `tree` dirs and
    /// `commit` submodules) and rejects entries with unsafe paths (absolute, or
    /// containing a `.`/`..` component) so a crafted tree can't escape the
    /// worktree on download.
    public static func parseTreeAPI(_ data: Data) -> RepoManifest? {
        guard let resp = try? JSONDecoder().decode(TreeResponse.self, from: data) else {
            return nil
        }
        var blobs: [String: RepoBlob] = [:]
        for node in resp.tree ?? [] {
            guard node.type == "blob",
                  let path = node.path, let sha = node.sha,
                  isSafePath(path) else { continue }
            blobs[path] = RepoBlob(path: path, sha: sha, size: node.size ?? 0)
        }
        return RepoManifest(
            treeSha: resp.sha ?? "", truncated: resp.truncated ?? false, blobs: blobs)
    }

    /// Reject paths that could escape the working copy: empty, absolute, or with
    /// any `.`/`..` component. GitHub trees are normally clean; this is defense.
    static func isSafePath(_ p: String) -> Bool {
        guard !p.isEmpty, !p.hasPrefix("/") else { return false }
        let comps = p.split(separator: "/", omittingEmptySubsequences: false)
        return !comps.contains("") && !comps.contains(".") && !comps.contains("..")
    }

    /// Mirror of the git-trees API response shape (only the fields we read).
    private struct TreeResponse: Decodable {
        let sha: String?
        let truncated: Bool?
        let tree: [Node]?
        struct Node: Decodable {
            let path: String?
            let type: String?
            let sha: String?
            let size: Int?
        }
    }
}

/// The difference between two repo manifests: which blobs were added, changed
/// (same path, different SHA), or removed. Drives an incremental refresh —
/// (re)download `added` + `changed`, delete `removed`.
public struct ManifestDiff: Equatable, Sendable {
    /// Blobs present in the new manifest but not the old (by path).
    public let added: [RepoBlob]
    /// Blobs whose path exists in both but whose SHA differs (the *new* blob).
    public let changed: [RepoBlob]
    /// Repo-relative paths present in the old manifest but gone in the new.
    public let removed: [String]

    public init(added: [RepoBlob], changed: [RepoBlob], removed: [String]) {
        self.added = added
        self.changed = changed
        self.removed = removed
    }

    /// Nothing to do — the two manifests have identical path→SHA maps.
    public var isEmpty: Bool {
        added.isEmpty && changed.isEmpty && removed.isEmpty
    }

    /// Blobs whose bytes must be (re)downloaded: `added` ∪ `changed`, path-sorted
    /// for predictable download sequencing (and stable tests).
    public var toFetch: [RepoBlob] {
        (added + changed).sorted { $0.path < $1.path }
    }

    /// Count of distinct files affected (for the "↻ N updated" UI).
    public var changeCount: Int {
        added.count + changed.count + removed.count
    }
}

public extension RepoManifest {
    /// Diff `old` → `new`. Pure; the order within each set is path-sorted for
    /// stable tests and predictable download sequencing.
    static func diff(from old: RepoManifest, to new: RepoManifest) -> ManifestDiff {
        var added: [RepoBlob] = []
        var changed: [RepoBlob] = []
        for (path, blob) in new.blobs {
            if let prev = old.blobs[path] {
                if prev.sha != blob.sha { changed.append(blob) }
            } else {
                added.append(blob)
            }
        }
        let removed = old.blobs.keys.filter { new.blobs[$0] == nil }
        return ManifestDiff(
            added: added.sorted { $0.path < $1.path },
            changed: changed.sorted { $0.path < $1.path },
            removed: removed.sorted())
    }
}

/// Persisted sidecar for a materialized GitHub vault: the repo link it came from
/// (owner/repo/ref) plus the manifest of its last-synced tree. The app stores
/// this at `.markup/manifest.json` under the vault root so a later refresh knows
/// which repo/ref to fetch and can diff to download only what changed.
public struct GitHubVaultMeta: Codable, Equatable, Sendable {
    public var link: GitHubLink
    public var manifest: RepoManifest

    public init(link: GitHubLink, manifest: RepoManifest) {
        self.link = link
        self.manifest = manifest
    }
}
