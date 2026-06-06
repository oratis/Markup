import Foundation

/// Helpers for turning a GitHub **zipball** (the `/repos/{owner}/{repo}/zipball`
/// archive) into a flat, vault-rooted file tree.
///
/// GitHub wraps every entry in a single top-level directory named
/// `{owner}-{repo}-{shortsha}/` (e.g. `Genymobile-scrcpy-a1b2c3d/README.md`).
/// To open the archive as a vault we strip that wrapper so paths are
/// repo-root-relative (`README.md`, `doc/build.md`, …).
///
/// Pure (no I/O): `GitHubVaultService` pairs these with `ZipArchive` entry data
/// to write the working copy (design `docs/design/ios/03-github-primary-vault.md`
/// §16 — the "zipball working-copy" target).
public enum GitHubZipball {
    /// The single top-level directory shared by every (non-empty) entry, or
    /// `nil` if the entries don't all sit under one common first path segment.
    /// GitHub zipballs always have exactly one, so `nil` signals a malformed /
    /// non-zipball archive.
    public static func topLevelDir(_ paths: [String]) -> String? {
        var top: String?
        for path in paths {
            let segs = path.split(separator: "/", omittingEmptySubsequences: true)
            guard let first = segs.first.map(String.init) else { continue }
            if let top {
                if first != top { return nil }
            } else {
                top = first
            }
        }
        return top
    }

    /// Map one zipball entry path to its vault-root-relative path by dropping
    /// `topLevel/`. Returns `nil` for the top dir itself, anything outside it,
    /// or a pure directory entry (trailing `/`) — i.e. only real files survive.
    public static func vaultPath(_ path: String, topLevel: String) -> String? {
        let prefix = topLevel + "/"
        guard path.hasPrefix(prefix) else { return nil }
        let rel = String(path.dropFirst(prefix.count))
        if rel.isEmpty || rel.hasSuffix("/") { return nil }
        return rel
    }
}
