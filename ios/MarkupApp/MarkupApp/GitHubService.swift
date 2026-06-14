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

    /// Coarse progress while materializing a repo into a vault, surfaced in the
    /// "Opening…" overlay so a large repo never looks frozen.
    enum OpenVaultPhase: Sendable {
        case resolving
        case downloading(fraction: Double?)  // nil when the server sends no length
        case extracting
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
    ///
    /// Also snapshots a `RepoManifest` sidecar (`.markup/manifest.json`) so a
    /// later `refreshVault` can diff and download only what changed instead of
    /// re-fetching the whole zipball (design §5, §17). To keep the zipball and
    /// the manifest consistent we first resolve `link` to an exact commit SHA and
    /// pin both to it; if that resolution fails (e.g. rate limit) we fall back to
    /// the bare-ref zipball with no manifest, and the next refresh re-downloads.
    func openAsVault(
        _ link: GitHubLink,
        progress: AsyncStream<OpenVaultPhase>.Continuation? = nil
    ) async throws -> URL {
        progress?.yield(.resolving)
        // Pin to an immutable commit when we can, so the extracted tree exactly
        // matches the manifest we snapshot (and refreshes can diff cleanly).
        let resolved = try? await resolveCommit(link)
        progress?.yield(.downloading(fraction: nil))
        let data = try await downloadZipball(
            owner: link.owner, repo: link.repo,
            ref: resolved?.sha ?? (link.ref?.isEmpty == false ? link.ref : nil),
            onFraction: progress.map { cont in
                { @Sendable (frac: Double?) in cont.yield(.downloading(fraction: frac)) }
            })

        progress?.yield(.extracting)
        let root = Self.vaultRoot(for: link)
        // Decompress + write off the main thread (a whole repo is heavy work);
        // extractZipball is nonisolated so this runs on a background executor.
        try await Task.detached(priority: .userInitiated) {
            try Self.extractZipball(data, to: root)
        }.value

        // Snapshot the manifest (best-effort): a failure here just means the next
        // refresh falls back to a full re-download. Store the original `link`
        // (ref preserved, incl. nil) so a refresh resolves the same ref and the
        // vault path stays stable.
        if let sha = resolved?.sha,
           let manifest = try? await fetchTree(owner: link.owner, repo: link.repo, treeish: sha) {
            try? Self.writeMeta(GitHubVaultMeta(link: link, manifest: manifest), vaultRoot: root)
        }
        return root
    }

    /// Outcome of a refresh, for the "↻ N updated" UI.
    struct RefreshResult: Sendable {
        /// Files added or changed (re)downloaded.
        let updated: Int
        /// Files deleted from the working copy.
        let removed: Int
        /// True when we couldn't diff incrementally and re-extracted the whole
        /// zipball instead (no stored manifest, truncated tree, or an error).
        let fullReset: Bool

        /// Nothing changed since the last sync.
        var isNoOp: Bool { !fullReset && updated == 0 && removed == 0 }
        var changeCount: Int { updated + removed }
    }

    /// Bring a materialized GitHub vault up to date **incrementally**: fetch the
    /// repo's current tree, diff it against the stored manifest, download only the
    /// added/changed blobs (raw host, CDN-fast) and delete the removed ones —
    /// instead of re-downloading the whole zipball (design §5). Falls back to a
    /// full zipball re-extract (and returns `fullReset: true`) when there's no
    /// stored manifest, the tree is truncated, or anything goes wrong, so refresh
    /// always leaves a complete, consistent vault.
    @discardableResult
    func refreshVault(at root: URL) async throws -> RefreshResult {
        guard let meta = Self.readMeta(vaultRoot: root) else {
            throw GitHubError.notFound // not a GitHub vault / no manifest to diff
        }
        let link = meta.link
        do {
            let resolved = try await resolveCommit(link)
            let new = try await fetchTree(owner: link.owner, repo: link.repo, treeish: resolved.sha)
            // A truncated tree is incomplete — diffing it would wrongly delete the
            // dropped files. Bail to the full-zipball fallback instead.
            guard !new.truncated else { throw GitHubError.badArchive }

            let diff = RepoManifest.diff(from: meta.manifest, to: new)
            if !diff.isEmpty {
                try await materialize(diff, owner: link.owner, repo: link.repo,
                                      commit: resolved.sha, root: root)
                for path in diff.removed { Self.deleteFile(path, under: root) }
            }
            // Re-point the manifest only after the working copy is updated.
            try Self.writeMeta(GitHubVaultMeta(link: link, manifest: new), vaultRoot: root)
            return RefreshResult(
                updated: diff.added.count + diff.changed.count,
                removed: diff.removed.count, fullReset: false)
        } catch {
            // Fallback: re-extract the whole zipball (also re-snapshots the
            // manifest). openAsVault recomputes the same root from `link`.
            _ = try await openAsVault(link)
            return RefreshResult(updated: 0, removed: 0, fullReset: true)
        }
    }

    /// Download the added/changed blobs of a diff into the working copy in
    /// parallel, pinned to `commit` (so all bytes are from one consistent tree).
    /// A real failure propagates so the caller can fall back rather than leave a
    /// half-updated vault.
    private func materialize(
        _ diff: ManifestDiff, owner: String, repo: String, commit: String, root: URL
    ) async throws {
        try await withThrowingTaskGroup(of: Void.self) { group in
            for blob in diff.toFetch {
                group.addTask {
                    let data = try await self.rawHostData(
                        owner: owner, repo: repo, ref: commit, path: blob.path)
                    try self.writeFile(data, to: root.appendingPathComponent(blob.path), under: root)
                }
            }
            try await group.waitForAll()
        }
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

    /// The base directory holding all downloaded GitHub vaults.
    nonisolated static var vaultsBase: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("GitHubVaults", isDirectory: true)
    }

    /// All materialized GitHub vault directories on disk (those carrying a
    /// `.markup` manifest sidecar), with their byte sizes.
    nonisolated static func downloadedVaults() -> [(url: URL, bytes: Int64)] {
        let fm = FileManager.default
        guard let en = fm.enumerator(at: vaultsBase, includingPropertiesForKeys: [.isDirectoryKey])
        else { return [] }
        var out: [(URL, Int64)] = []
        for case let url as URL in en {
            let isDir = (try? url.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true
            if isDir, readMeta(vaultRoot: url) != nil {
                out.append((url, directorySize(url)))
                en.skipDescendants() // don't recurse into a vault we already counted
            }
        }
        return out
    }

    /// Delete every downloaded GitHub vault except `keeping` (the active one),
    /// plus the transient asset cache. Returns the number of vaults removed.
    /// Safe: never touches the open vault or anything outside our containers.
    @discardableResult
    nonisolated static func clearCaches(keeping active: URL?) -> Int {
        let fm = FileManager.default
        try? fm.removeItem(at: cacheRoot) // transient per-doc asset cache
        let keepPath = active?.standardizedFileURL.path
        var removed = 0
        for vault in downloadedVaults() where vault.url.standardizedFileURL.path != keepPath {
            if (try? fm.removeItem(at: vault.url)) != nil { removed += 1 }
        }
        return removed
    }

    /// Recursive byte size of a directory (best-effort; 0 on error).
    nonisolated static func directorySize(_ url: URL) -> Int64 {
        let fm = FileManager.default
        guard let en = fm.enumerator(at: url, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }
        var total: Int64 = 0
        for case let f as URL in en {
            total += Int64((try? f.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0)
        }
        return total
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

    // MARK: - Incremental-refresh networking

    /// Download a repo's zipball bytes (optionally pinned to `ref`, which may be
    /// a branch, tag, or commit SHA). Shared by the first-time open and the
    /// refresh fallback.
    private func downloadZipball(
        owner: String, repo: String, ref: String?,
        onFraction: (@Sendable (Double?) -> Void)? = nil
    ) async throws -> Data {
        var s = "https://api.github.com/repos/\(owner)/\(repo)/zipball"
        if let ref, !ref.isEmpty { s += "/\(ref)" }
        guard let url = URL(string: s) else { throw GitHubError.badURL }
        var req = URLRequest(url: url)
        req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        req.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        // Download to a temp file so a per-task delegate can report byte
        // progress (the in-memory `data(for:)` variant offers none). The whole
        // archive is read back into memory afterwards for extraction, as before.
        let tempURL: URL
        let resp: URLResponse
        if let onFraction {
            let delegate = ZipballDownloadDelegate(onFraction: onFraction)
            (tempURL, resp) = try await URLSession.shared.download(for: req, delegate: delegate)
        } else {
            (tempURL, resp) = try await URLSession.shared.download(for: req)
        }
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { throw Self.httpError(resp, code) }
        return try Data(contentsOf: tempURL)
    }

    /// Resolve `link`'s ref (or the repo's default branch when it has none) to
    /// an exact commit SHA, returning both. Pinning the zipball, tree, and raw
    /// downloads to one commit makes the working copy + manifest consistent,
    /// handles refs containing `/` (e.g. `feature/x`), and avoids a push racing
    /// mid-refresh. Uses the `application/vnd.github.sha` media type, which
    /// returns the commit SHA as the plain-text body.
    private func resolveCommit(_ link: GitHubLink) async throws -> (ref: String, sha: String) {
        let ref = (link.ref?.isEmpty == false) ? link.ref! : try await defaultBranch(link)
        var allowed = CharacterSet.urlPathAllowed
        allowed.remove("/")
        let enc = ref.addingPercentEncoding(withAllowedCharacters: allowed) ?? ref
        guard let url = URL(string:
            "https://api.github.com/repos/\(link.owner)/\(link.repo)/commits/\(enc)") else {
            throw GitHubError.badURL
        }
        var req = URLRequest(url: url)
        req.setValue("application/vnd.github.sha", forHTTPHeaderField: "Accept")
        req.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200,
              let sha = String(data: data, encoding: .utf8)?
                .trimmingCharacters(in: .whitespacesAndNewlines), !sha.isEmpty else {
            throw Self.httpError(resp, code)
        }
        return (ref, sha)
    }

    /// The repo's default branch name (used when a link pins no ref).
    private func defaultBranch(_ link: GitHubLink) async throws -> String {
        guard let url = URL(string:
            "https://api.github.com/repos/\(link.owner)/\(link.repo)") else {
            throw GitHubError.badURL
        }
        var req = URLRequest(url: url)
        req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        req.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { throw Self.httpError(resp, code) }
        let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        guard let branch = o?["default_branch"] as? String else { throw GitHubError.badArchive }
        return branch
    }

    /// Fetch the recursive git-tree at `treeish` (a commit/tree SHA or ref) and
    /// parse it into a `RepoManifest` (the pure model + parsing live in MarkupKit).
    private func fetchTree(owner: String, repo: String, treeish: String) async throws -> RepoManifest {
        guard let url = URL(string:
            "https://api.github.com/repos/\(owner)/\(repo)/git/trees/\(treeish)?recursive=1") else {
            throw GitHubError.badURL
        }
        var req = URLRequest(url: url)
        req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        req.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { throw Self.httpError(resp, code) }
        guard let manifest = RepoManifest.parseTreeAPI(data) else { throw GitHubError.badArchive }
        return manifest
    }

    /// Fetch one file's bytes from `raw.githubusercontent.com` (CDN-fast and not
    /// counted against the API rate limit), pinned to `ref` (a commit SHA for
    /// refresh). A token, when present, is sent so private repos resolve too.
    private func rawHostData(owner: String, repo: String, ref: String, path: String) async throws -> Data {
        let link = GitHubLink(owner: owner, repo: repo, ref: ref, path: path, isDirectory: false)
        guard let s = GitHubLinkParser.rawURL(link), let url = URL(string: s) else {
            throw GitHubError.badURL
        }
        var req = URLRequest(url: url)
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { throw Self.httpError(resp, code) }
        return data
    }

    // MARK: - Manifest sidecar (persisted alongside a GitHub vault)

    /// The manifest sidecar path for a vault: `.markup/manifest.json` under the
    /// vault root. The `.markup` dir is hidden, so `VaultStore.scan()` (which
    /// skips hidden files) never lists or indexes it.
    nonisolated static func metaURL(forVaultRoot root: URL) -> URL {
        root.appendingPathComponent(".markup", isDirectory: true)
            .appendingPathComponent("manifest.json")
    }

    /// Read a vault's GitHub metadata sidecar, or `nil` if it isn't a GitHub
    /// vault (no sidecar) or the file is unreadable/corrupt.
    nonisolated static func readMeta(vaultRoot root: URL) -> GitHubVaultMeta? {
        guard let data = try? Data(contentsOf: metaURL(forVaultRoot: root)) else { return nil }
        return try? JSONDecoder().decode(GitHubVaultMeta.self, from: data)
    }

    /// Repo-relative paths whose on-disk content no longer matches the synced
    /// manifest — i.e. files edited locally since the last sync, which a refresh
    /// would overwrite. Compares each tracked file's git-blob SHA against the
    /// manifest. Returns `[]` for a clean vault or a non-GitHub folder. A
    /// missing tracked file isn't "modified" (refresh re-adds it), and an
    /// untracked new local file isn't reported (refresh leaves it alone). Pure
    /// file I/O — `nonisolated` so the caller can run it off the main actor.
    nonisolated static func locallyModifiedPaths(at root: URL) -> [String] {
        guard let meta = readMeta(vaultRoot: root) else { return [] }
        var dirty: [String] = []
        for (path, blob) in meta.manifest.blobs {
            let fileURL = root.appendingPathComponent(path)
            guard let data = try? Data(contentsOf: fileURL) else { continue }
            // Known size differs → certainly edited; skip the hash. Otherwise
            // (size matches or the API omitted it) compare blob SHAs.
            let sizeMismatch = blob.size > 0 && data.count != blob.size
            if sizeMismatch || GitBlob.sha(data) != blob.sha {
                dirty.append(path)
            }
        }
        return dirty.sorted()
    }

    /// Write a vault's GitHub metadata sidecar atomically (creating `.markup/`).
    nonisolated static func writeMeta(_ meta: GitHubVaultMeta, vaultRoot root: URL) throws {
        let url = metaURL(forVaultRoot: root)
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(meta).write(to: url, options: .atomic)
    }

    /// Delete a working-copy file by its repo-relative path, guarding against a
    /// path escaping the vault root (defense against a crafted manifest entry).
    nonisolated static func deleteFile(_ relPath: String, under root: URL) {
        let dest = root.appendingPathComponent(relPath).standardizedFileURL
        guard dest.path.hasPrefix(root.standardizedFileURL.path + "/") else { return }
        try? FileManager.default.removeItem(at: dest)
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

/// Bridges `URLSession.download(for:delegate:)` byte progress to a fraction
/// callback (0…1, or nil when the server sends no Content-Length), throttled to
/// whole-percent changes. Callbacks arrive on a background queue.
private final class ZipballDownloadDelegate: NSObject, URLSessionDownloadDelegate, @unchecked Sendable {
    private let onFraction: @Sendable (Double?) -> Void
    private var lastPct = -1

    init(onFraction: @escaping @Sendable (Double?) -> Void) { self.onFraction = onFraction }

    func urlSession(
        _ session: URLSession, downloadTask: URLSessionDownloadTask,
        didWriteData bytesWritten: Int64, totalBytesWritten: Int64,
        totalBytesExpectedToWrite expected: Int64
    ) {
        guard expected > 0 else { onFraction(nil); return }
        let frac = Double(totalBytesWritten) / Double(expected)
        let pct = Int(frac * 100)
        if pct != lastPct {
            lastPct = pct
            onFraction(frac)
        }
    }

    // Required by URLSessionDownloadDelegate; the async download(for:delegate:)
    // returns the file URL itself, so there's nothing to do on completion.
    func urlSession(
        _ session: URLSession, downloadTask: URLSessionDownloadTask,
        didFinishDownloadingTo location: URL
    ) {}
}

