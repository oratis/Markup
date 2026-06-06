import Foundation
import MarkupKit

/// Fetches files from GitHub. Public repos work with no auth; a token (set in a
/// later OAuth phase) raises rate limits and unlocks private repos. Uses the
/// REST contents API with a raw Accept header so the same path serves both.
@MainActor
final class GitHubService {
    static let shared = GitHubService()

    enum GitHubError: LocalizedError {
        case notAFile, rateLimited, forbidden, notFound, http(Int), badURL, badArchive
        var errorDescription: String? {
            switch self {
            case .notAFile: return "That link points to a folder, not a file."
            case .rateLimited: return "GitHub rate limit reached — sign in to raise it."
            case .forbidden: return "Access denied. Sign in to view private repos, or check your access."
            case .notFound: return "File not found (or the repo is private)."
            case .http(let c): return "GitHub request failed (HTTP \(c))."
            case .badURL: return "Couldn't build the request URL."
            case .badArchive: return "Couldn't read the repository archive."
            }
        }
    }

    /// Map a non-2xx GitHub response to a `GitHubError`, distinguishing a real
    /// rate-limit (403/429 with `x-ratelimit-remaining: 0`) from an
    /// authorization failure (403/401), which would otherwise both read as
    /// "rate limit reached — sign in", misleading already-signed-in users.
    private static func httpError(_ resp: URLResponse, _ code: Int) -> GitHubError {
        switch code {
        case 404: return .notFound
        case 429: return .rateLimited
        case 401: return .forbidden
        case 403:
            let remaining = (resp as? HTTPURLResponse)?
                .value(forHTTPHeaderField: "x-ratelimit-remaining")
            return remaining == "0" ? .rateLimited : .forbidden
        default: return .http(code)
        }
    }

    /// OAuth token, when signed in. Phase 1 is public-only, so this is nil.
    var token: String? { GitHubAuth.shared.token }

    /// A GitHub document materialized into a local working copy: the primary
    /// doc at `fileURL` (under a repo-path-mirrored `root`, alongside its
    /// downloaded in-repo assets). Grant the reader read-access to `root` so
    /// relative images / stylesheets resolve like a local file.
    struct GitHubDoc {
        let fileURL: URL
        let root: URL
        /// The repo link this doc came from (owner/repo/ref/path) — lets the
        /// reader re-materialize in-repo links tapped inside it.
        let link: GitHubLink
    }

    /// Download `link` **and the in-repo assets it references** into a local
    /// working copy mirroring the repo's path layout, so the reader renders it
    /// with full fidelity (images, CSS, JS) instead of 404-ing every relative
    /// URL. Asset failures are non-fatal — a missing image shouldn't block the
    /// doc from opening.
    func openFile(_ link: GitHubLink) async throws -> GitHubDoc {
        guard !link.isDirectory, !link.path.isEmpty else { throw GitHubError.notAFile }

        let root = Self.cacheRoot
            .appendingPathComponent(UUID().uuidString.prefix(8).description, isDirectory: true)
        // 1. The primary document (hard-fails on error — there's nothing to show).
        let docData = try await rawData(for: link)
        let docFile = root.appendingPathComponent(link.path)
        try writeFile(docData, to: docFile, under: root)

        // 2. Its in-repo assets (best-effort, in parallel).
        let text = String(data: docData, encoding: .utf8) ?? ""
        let plan = FileKind.of(link.fileName) == .html
            ? GitHubAssetPlan.html(text, docPath: link.path)
            : GitHubAssetPlan.markdown(text, docPath: link.path)
        await withTaskGroup(of: Void.self) { group in
            for assetPath in plan.assetPaths {
                let assetLink = GitHubLink(
                    owner: link.owner, repo: link.repo, ref: link.ref,
                    path: assetPath, isDirectory: false)
                group.addTask {
                    if let data = try? await self.rawData(for: assetLink) {
                        try? self.writeFile(data, to: root.appendingPathComponent(assetPath), under: root)
                    }
                }
            }
        }
        return GitHubDoc(fileURL: docFile, root: root, link: link)
    }

    /// Fetch a single file's raw bytes via the contents API (raw media type),
    /// mapping HTTP failures to `GitHubError`.
    private func rawData(for link: GitHubLink) async throws -> Data {
        guard let url = URL(string: GitHubLinkParser.contentsAPIURL(link)) else {
            throw GitHubError.badURL
        }
        var req = URLRequest(url: url)
        req.setValue("application/vnd.github.raw+json", forHTTPHeaderField: "Accept")
        req.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { throw Self.httpError(resp, code) }
        return data
    }

    /// Write `data` to `dest`, creating parent dirs — but only if `dest` stays
    /// within `root` (defense against a crafted path escaping the working copy).
    nonisolated private func writeFile(_ data: Data, to dest: URL, under root: URL) throws {
        let destStd = dest.standardizedFileURL
        guard destStd.path.hasPrefix(root.standardizedFileURL.path) else {
            throw GitHubError.badURL
        }
        try FileManager.default.createDirectory(
            at: destStd.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: destStd, options: .atomic)
    }

    /// A managed, app-owned cache directory for downloaded GitHub content
    /// (`<caches>/MarkupGitHub/`). Replaces scattering temp files in the system
    /// temp dir, and gives PR-2's working copies a stable home to mirror repo
    /// paths under. The OS may evict it under storage pressure — fine, it's a
    /// cache; offline persistence is a later concern.
    static let cacheRoot: URL = {
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("MarkupGitHub", isDirectory: true)
    }()

    /// Download a whole repo as a **vault**: fetch its zipball, extract it to a
    /// durable app-owned directory mirroring the repo tree, and return that
    /// directory for `VaultStore` to open. The reader, search, index, and
    /// in-repo links then all work locally + offline — the design's
    /// "zipball working-copy" target (§16). A previous copy of the same repo is
    /// replaced so re-opening refreshes it.
    func openAsVault(_ link: GitHubLink) async throws -> URL {
        var s = "https://api.github.com/repos/\(link.owner)/\(link.repo)/zipball"
        if let ref = link.ref, !ref.isEmpty { s += "/\(ref)" }
        guard let url = URL(string: s) else { throw GitHubError.badURL }
        var req = URLRequest(url: url)
        req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        req.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { throw Self.httpError(resp, code) }

        let root = Self.vaultRoot(for: link)
        // Decompress + write off the main thread (a whole repo is heavy work);
        // extractZipball is nonisolated so this runs on a background executor.
        try await Task.detached(priority: .userInitiated) {
            try Self.extractZipball(data, to: root)
        }.value
        return root
    }

    /// The durable, app-owned vault directory for a repo, as separate path
    /// components `GitHubVaults/<owner>/<refSlug>/<repo>` under Application
    /// Support — unambiguous (no hyphen aliasing) and ref-keyed (branches don't
    /// clobber each other), with the repo name as the leaf for display.
    static func vaultRoot(for link: GitHubLink) -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        var url = base.appendingPathComponent("GitHubVaults", isDirectory: true)
        for c in GitHubZipball.vaultPathComponents(
            owner: link.owner, repo: link.repo, ref: link.ref) {
            url = url.appendingPathComponent(c, isDirectory: true)
        }
        return url
    }

    /// Extract a GitHub zipball (one `owner-repo-sha/` wrapper dir) into `root`,
    /// stripping the wrapper so paths are repo-root-relative. Builds the tree in
    /// a sibling temp dir and **atomically** swaps it into place, so a re-open of
    /// the active vault never exposes a half-written tree and a mid-extract crash
    /// can't leave a truncated vault. Off the main actor — file I/O + decompression.
    nonisolated static func extractZipball(_ data: Data, to root: URL) throws {
        // Fail loudly on zip64 rather than open a silently-incomplete vault:
        // ZipArchive can't parse it and would drop entries with no error.
        if ZipArchive.isLikelyZip64(data) { throw GitHubError.badArchive }
        let entries = ZipArchive.extract(data)
        guard let top = GitHubZipball.topLevelDir(entries.map(\.path)) else {
            throw GitHubError.badArchive
        }
        let fm = FileManager.default
        let parent = root.deletingLastPathComponent()
        try fm.createDirectory(at: parent, withIntermediateDirectories: true)
        let temp = parent.appendingPathComponent(".tmp-\(UUID().uuidString)", isDirectory: true)
        try fm.createDirectory(at: temp, withIntermediateDirectories: true)
        defer { try? fm.removeItem(at: temp) } // no-op once moved/replaced
        let tempPath = temp.standardizedFileURL.path
        for e in entries {
            guard let rel = GitHubZipball.vaultPath(e.path, topLevel: top) else { continue }
            let dest = temp.appendingPathComponent(rel).standardizedFileURL
            guard dest.path.hasPrefix(tempPath + "/") else { continue } // traversal guard
            try? fm.createDirectory(
                at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? e.data.write(to: dest)
        }
        // Atomic swap: replace an existing vault in place, else move into position.
        if fm.fileExists(atPath: root.path) {
            _ = try fm.replaceItemAt(root, withItemAt: temp)
        } else {
            try fm.moveItem(at: temp, to: root)
        }
    }

    /// List a repo folder's entries (folders first, then files).
    func listDirectory(_ link: GitHubLink) async throws -> [GitHubEntry] {
        guard let url = URL(string: GitHubLinkParser.contentsAPIURL(link)) else {
            throw GitHubError.badURL
        }
        var req = URLRequest(url: url)
        req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        req.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { throw Self.httpError(resp, code) }
        return GitHubContents.parse(data)
    }

    /// List the signed-in user's repositories (most-recently-updated first from
    /// the API, then private-first / alphabetical via `GitHubRepos.parse`).
    func listRepos() async throws -> [GitHubRepo] {
        guard let url = URL(string:
            "https://api.github.com/user/repos?per_page=100&sort=updated") else {
            throw GitHubError.badURL
        }
        var req = URLRequest(url: url)
        req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        req.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { throw Self.httpError(resp, code) }
        return GitHubRepos.parse(data)
    }

    /// A directory link for navigating into `entry` from a parent `link`.
    func childLink(_ parent: GitHubLink, _ entry: GitHubEntry) -> GitHubLink {
        GitHubLink(owner: parent.owner, repo: parent.repo, ref: parent.ref,
                   path: entry.path, isDirectory: entry.isDir)
    }
}

