import Foundation
import MarkupKit

/// Fetches files from GitHub. Public repos work with no auth; a token (set in a
/// later OAuth phase) raises rate limits and unlocks private repos. Uses the
/// REST contents API with a raw Accept header so the same path serves both.
@MainActor
final class GitHubService {
    static let shared = GitHubService()

    enum GitHubError: LocalizedError {
        case notAFile, rateLimited, notFound, http(Int), badURL
        var errorDescription: String? {
            switch self {
            case .notAFile: return "That link points to a folder, not a file."
            case .rateLimited: return "GitHub rate limit reached — sign in to raise it."
            case .notFound: return "File not found (or the repo is private)."
            case .http(let c): return "GitHub request failed (HTTP \(c))."
            case .badURL: return "Couldn't build the request URL."
            }
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
        return GitHubDoc(fileURL: docFile, root: root)
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
        switch code {
        case 200: return data
        case 403, 429: throw GitHubError.rateLimited
        case 404: throw GitHubError.notFound
        default: throw GitHubError.http(code)
        }
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
        switch code {
        case 200: return GitHubContents.parse(data)
        case 403, 429: throw GitHubError.rateLimited
        case 404: throw GitHubError.notFound
        default: throw GitHubError.http(code)
        }
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
        switch code {
        case 200: return GitHubRepos.parse(data)
        case 401, 403: throw GitHubError.rateLimited
        default: throw GitHubError.http(code)
        }
    }

    /// A directory link for navigating into `entry` from a parent `link`.
    func childLink(_ parent: GitHubLink, _ entry: GitHubEntry) -> GitHubLink {
        GitHubLink(owner: parent.owner, repo: parent.repo, ref: parent.ref,
                   path: entry.path, isDirectory: entry.isDir)
    }
}

