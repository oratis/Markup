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

    /// Download a file referenced by `link` and write it to a temp file,
    /// returning that URL (so the existing reader can render + record it).
    func openFile(_ link: GitHubLink) async throws -> URL {
        guard !link.isDirectory, !link.path.isEmpty else { throw GitHubError.notAFile }
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
        case 200: break
        case 403, 429: throw GitHubError.rateLimited
        case 404: throw GitHubError.notFound
        default: throw GitHubError.http(code)
        }

        let name = link.fileName
        let dest = FileManager.default.temporaryDirectory
            .appendingPathComponent("gh-\(UUID().uuidString.prefix(8))-\(name)")
        try data.write(to: dest, options: .atomic)
        return dest
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
        switch code {
        case 200: return GitHubContents.parse(data)
        case 403, 429: throw GitHubError.rateLimited
        case 404: throw GitHubError.notFound
        default: throw GitHubError.http(code)
        }
    }

    /// A directory link for navigating into `entry` from a parent `link`.
    func childLink(_ parent: GitHubLink, _ entry: GitHubEntry) -> GitHubLink {
        GitHubLink(owner: parent.owner, repo: parent.repo, ref: parent.ref,
                   path: entry.path, isDirectory: entry.isDir)
    }
}

