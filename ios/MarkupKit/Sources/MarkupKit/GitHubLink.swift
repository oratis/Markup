import Foundation

/// A parsed reference to a file or folder on GitHub.
public struct GitHubLink: Equatable, Hashable, Sendable {
    public var owner: String
    public var repo: String
    /// Branch / tag / commit SHA, or `nil` for the repo's default branch.
    public var ref: String?
    /// Path within the repo ("" for the repo root).
    public var path: String
    public var isDirectory: Bool

    public init(
        owner: String, repo: String, ref: String? = nil, path: String = "",
        isDirectory: Bool = false
    ) {
        self.owner = owner
        self.repo = repo
        self.ref = ref
        self.path = path
        self.isDirectory = isDirectory
    }

    public var fileName: String {
        path.isEmpty ? repo : (path as NSString).lastPathComponent
    }
}

/// One entry in a GitHub directory listing (REST contents API).
public struct GitHubEntry: Codable, Equatable, Sendable, Identifiable {
    public var name: String
    public var path: String
    public var type: String // "file" | "dir"
    public var isDir: Bool { type == "dir" }
    public var id: String { path }

    public init(name: String, path: String, type: String) {
        self.name = name
        self.path = path
        self.type = type
    }

    private enum CodingKeys: String, CodingKey { case name, path, type }
}

/// A repository from the authenticated user's repo list.
public struct GitHubRepo: Codable, Equatable, Sendable, Identifiable {
    public var fullName: String // "owner/name"
    public var name: String
    public var isPrivate: Bool
    public var id: String { fullName }

    public init(fullName: String, name: String, isPrivate: Bool) {
        self.fullName = fullName
        self.name = name
        self.isPrivate = isPrivate
    }

    private enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
        case name
        case isPrivate = "private"
    }

    /// A directory link to this repo's root for browsing.
    public var link: GitHubLink {
        let owner = fullName.split(separator: "/").first.map(String.init) ?? ""
        return GitHubLink(owner: owner, repo: name, isDirectory: true)
    }
}

public enum GitHubRepos {
    /// Decode the `/user/repos` listing (private first, then by name). Returns
    /// `[]` for bad JSON.
    public static func parse(_ data: Data) -> [GitHubRepo] {
        let repos = (try? JSONDecoder().decode([GitHubRepo].self, from: data)) ?? []
        return repos.sorted {
            $0.isPrivate != $1.isPrivate
                ? $0.isPrivate && !$1.isPrivate
                : $0.fullName.localizedCaseInsensitiveCompare($1.fullName) == .orderedAscending
        }
    }
}

public enum GitHubContents {
    /// Decode a contents-API directory listing; folders first, then files,
    /// each alphabetical. Returns `[]` for non-array (e.g. a file) or bad JSON.
    public static func parse(_ data: Data) -> [GitHubEntry] {
        let entries = (try? JSONDecoder().decode([GitHubEntry].self, from: data)) ?? []
        return entries.sorted {
            $0.isDir != $1.isDir
                ? $0.isDir && !$1.isDir
                : $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }
}

/// Parse GitHub web / raw URLs into a `GitHubLink`. Handles:
/// - `github.com/owner/repo` (repo root)
/// - `github.com/owner/repo/blob/<ref>/<path>` (file)
/// - `github.com/owner/repo/tree/<ref>/<path>` (folder)
/// - `raw.githubusercontent.com/owner/repo/<ref>/<path>` (raw file)
public enum GitHubLinkParser {
    public static func parse(_ urlString: String) -> GitHubLink? {
        let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        // Bare "owner/repo" (no scheme/host) → repo root.
        if !trimmed.contains("://"),
           Rx.matches("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", trimmed) {
            let parts = trimmed.split(separator: "/").map(String.init)
            return GitHubLink(owner: parts[0], repo: stripGit(parts[1]), isDirectory: true)
        }
        guard let comps = URLComponents(string: trimmed.contains("://") ? trimmed : "https://\(trimmed)"),
              let host = comps.host?.lowercased() else { return nil }

        // Path segments without leading/trailing empties.
        let segs = comps.path.split(separator: "/", omittingEmptySubsequences: true).map(String.init)

        switch host {
        case "github.com", "www.github.com":
            guard segs.count >= 2 else { return nil }
            let owner = segs[0], repo = stripGit(segs[1])
            guard segs.count >= 4, segs[2] == "blob" || segs[2] == "tree" else {
                // repo root
                return GitHubLink(owner: owner, repo: repo, isDirectory: true)
            }
            let isDir = segs[2] == "tree"
            let ref = segs[3]
            let path = segs.dropFirst(4).joined(separator: "/")
            return GitHubLink(
                owner: owner, repo: repo, ref: ref,
                path: decode(path), isDirectory: isDir || path.isEmpty)

        case "raw.githubusercontent.com", "raw.github.com":
            guard segs.count >= 3 else { return nil }
            let owner = segs[0], repo = stripGit(segs[1]), ref = segs[2]
            let path = segs.dropFirst(3).joined(separator: "/")
            return GitHubLink(
                owner: owner, repo: repo, ref: ref, path: decode(path),
                isDirectory: path.isEmpty)

        default:
            return nil
        }
    }

    /// The `raw.githubusercontent.com` URL for a file link (needs a ref).
    public static func rawURL(_ link: GitHubLink) -> String? {
        guard !link.isDirectory, !link.path.isEmpty, let ref = link.ref else { return nil }
        let encPath = link.path
            .split(separator: "/")
            .map { $0.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? String($0) }
            .joined(separator: "/")
        return "https://raw.githubusercontent.com/\(link.owner)/\(link.repo)/\(ref)/\(encPath)"
    }

    /// The GitHub REST API URL for a file/folder's contents.
    public static func contentsAPIURL(_ link: GitHubLink) -> String {
        var s = "https://api.github.com/repos/\(link.owner)/\(link.repo)/contents/\(link.path)"
        if let ref = link.ref { s += "?ref=\(ref)" }
        return s
    }

    private static func stripGit(_ s: String) -> String {
        s.hasSuffix(".git") ? String(s.dropLast(4)) : s
    }

    private static func decode(_ s: String) -> String {
        s.removingPercentEncoding ?? s
    }
}
