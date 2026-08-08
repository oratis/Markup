//! "Open a GitHub repo as a vault" — materialize a repo into a local working
//! copy, then the existing vault pipeline (`open_vault`) indexes it unchanged.
//!
//! This mirrors the shipped iOS design (`docs/design/ios/03-github-primary-vault.md`)
//! and the desktop plan (`docs/design/06-github-roundtrip.md`, batch **B301**):
//! download the repo's zipball, strip GitHub's `owner-repo-sha/` wrapper dir,
//! extract atomically into `~/Library/Caches/markup/github/<owner>/<ref>/<repo>/`,
//! and snapshot a `.markup/manifest.json` (path → blob SHA) so a later refresh
//! can diff and fetch only what changed.
//!
//! The pure helpers (`top_level_dir`, `vault_path`, `parse_tree_api`, …) are
//! ports of the unit-tested Swift in `ios/MarkupKit`; the network + I/O lives in
//! the `github_open_repo_vault` command. All GitHub-API logic that matters is
//! exercised offline (zip fixtures, JSON values) — `cargo test` makes no calls.

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Emitter, Manager};

const API_VERSION: &str = "2022-11-28";
const USER_AGENT: &str = "Markup";
/// Refuse archives larger than this (design §5 "zipball size guard"). Markup
/// targets docs-sized repos; a multi-GB monorepo would exhaust memory/disk.
const MAX_ZIPBALL_BYTES: u64 = 200 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Pure helpers — zipball path math (ported from iOS `GitHubZipball`)
// ---------------------------------------------------------------------------

/// The single top-level directory shared by every (non-empty) entry, or `None`
/// if the entries don't all sit under one common first path segment. GitHub
/// zipballs always have exactly one (`owner-repo-shortsha/`), so `None` signals
/// a malformed / non-zipball archive.
pub fn top_level_dir(paths: &[String]) -> Option<String> {
    let mut top: Option<String> = None;
    for path in paths {
        let Some(first) = path.split('/').find(|s| !s.is_empty()) else {
            continue;
        };
        match &top {
            Some(t) if first != t => return None,
            Some(_) => {}
            None => top = Some(first.to_string()),
        }
    }
    top
}

/// Map one zipball entry path to its vault-root-relative path by dropping
/// `topLevel/`. Returns `None` for the wrapper dir itself, anything outside it,
/// or a pure directory entry (trailing `/`) — only real files survive.
pub fn vault_path(path: &str, top_level: &str) -> Option<String> {
    let prefix = format!("{top_level}/");
    let rel = path.strip_prefix(&prefix)?;
    if rel.is_empty() || rel.ends_with('/') {
        return None;
    }
    Some(rel.to_string())
}

/// The path components under the `github/` cache base that uniquely locate a
/// repo's vault: `[owner, refSlug, repo]`. Separate components (not a
/// hyphen-joined string) avoid aliasing — `a/(b-c)` and `(a-b)/c` map to
/// distinct dirs — and the ref is part of the key so branches/tags of one repo
/// don't clobber each other. Each component is sanitized so a crafted
/// owner/repo/ref can't escape the cache dir.
pub fn vault_path_components(owner: &str, repo: &str, git_ref: Option<&str>) -> [String; 3] {
    [
        sanitize_component(owner, "_"),
        sanitize_component(git_ref.unwrap_or(""), "default"),
        sanitize_component(repo, "repo"),
    ]
}

/// One path component, made safe to use as a single directory name: path
/// separators collapse to `-`, and an empty / `.` / `..` value falls back to a
/// fixed placeholder so it can never traverse out of the cache root.
fn sanitize_component(s: &str, fallback: &str) -> String {
    let replaced: String = s
        .chars()
        .map(|c| if c == '/' || c == '\\' { '-' } else { c })
        .collect();
    let trimmed = replaced.trim();
    if trimmed.is_empty() || trimmed == "." || trimmed == ".." {
        fallback.to_string()
    } else {
        trimmed.to_string()
    }
}

/// Reject paths that could escape the working copy: empty, absolute, or with any
/// empty / `.` / `..` component. GitHub trees are normally clean; this is the
/// zip-slip / crafted-tree defense.
pub fn is_safe_path(p: &str) -> bool {
    if p.is_empty() || p.starts_with('/') {
        return false;
    }
    p.split('/').all(|c| !c.is_empty() && c != "." && c != "..")
}

// ---------------------------------------------------------------------------
// Manifest model (ported from iOS `RepoManifest`)
// ---------------------------------------------------------------------------

/// One file (a git "blob") in a repo tree: repo-relative path, content SHA, byte
/// size. The blob SHA is content-addressed, so a refresh can diff path → SHA and
/// fetch only what changed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RepoBlob {
    pub path: String,
    pub sha: String,
    pub size: u64,
}

/// A content-addressed snapshot of a repo's files at one tree SHA: path → blob.
/// Built from the git-trees API and persisted as the vault's `.markup/manifest.json`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RepoManifest {
    /// The tree SHA this manifest was built from.
    pub tree_sha: String,
    /// True when GitHub truncated the recursive tree (a very large repo): the
    /// manifest is then incomplete, so a refresh must fall back to a full
    /// re-download rather than trust a diff (which would mark dropped files as
    /// "removed").
    pub truncated: bool,
    /// path → blob, files only. `BTreeMap` keeps the serialized JSON
    /// deterministic (stable diffs, stable test goldens).
    pub blobs: BTreeMap<String, RepoBlob>,
}

/// The repo a materialized vault came from (owner/repo/ref), stored in the
/// sidecar so a refresh knows what to re-fetch.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GitHubVaultLink {
    pub owner: String,
    pub repo: String,
    #[serde(rename = "ref")]
    pub git_ref: Option<String>,
}

/// Persisted sidecar at `.markup/manifest.json` under a GitHub vault root.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GitHubVaultMeta {
    pub link: GitHubVaultLink,
    pub manifest: RepoManifest,
}

/// Build a manifest from a git-trees API JSON response. Returns `None` when the
/// response has no `tree` array. Keeps only `type == "blob"` entries (skips
/// `tree` dirs and `commit` submodules) and drops unsafe paths so a crafted tree
/// can't escape the worktree on download.
pub fn parse_tree_api(json: &serde_json::Value) -> Option<RepoManifest> {
    let nodes = json.get("tree")?.as_array()?;
    let mut blobs = BTreeMap::new();
    for node in nodes {
        if node.get("type").and_then(|v| v.as_str()) != Some("blob") {
            continue;
        }
        let (Some(path), Some(sha)) = (
            node.get("path").and_then(|v| v.as_str()),
            node.get("sha").and_then(|v| v.as_str()),
        ) else {
            continue;
        };
        if !is_safe_path(path) {
            continue;
        }
        let size = node.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
        blobs.insert(
            path.to_string(),
            RepoBlob {
                path: path.to_string(),
                sha: sha.to_string(),
                size,
            },
        );
    }
    Some(RepoManifest {
        tree_sha: json.get("sha").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        truncated: json.get("truncated").and_then(|v| v.as_bool()).unwrap_or(false),
        blobs,
    })
}

// ---------------------------------------------------------------------------
// Extraction — zipball bytes → atomic local working copy
// ---------------------------------------------------------------------------

/// Process-unique counter for temp/backup directory names (no `rand`/time
/// dependency, and stable across the resume-friendly build).
fn unique_id() -> u64 {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    COUNTER.fetch_add(1, Ordering::Relaxed)
}

/// Extract a GitHub zipball into `dest_root`, stripping the `owner-repo-sha/`
/// wrapper so paths are repo-root-relative. Builds the tree in a sibling temp
/// dir and **atomically swaps** it into place, so a re-open never sees a
/// half-written vault and a mid-extract crash can't leave a truncated one.
/// Blocking work — call via `spawn_blocking`.
pub fn extract_zipball(bytes: &[u8], dest_root: &Path) -> AppResult<()> {
    let cursor = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| AppError::Other(format!("not a valid zip archive: {e}")))?;

    // GitHub wraps every entry in one top-level dir; find it (and reject a
    // malformed archive that has none / more than one).
    let names: Vec<String> = (0..archive.len())
        .map(|i| archive.by_index(i).map(|f| f.name().to_string()))
        .collect::<Result<_, _>>()
        .map_err(|e| AppError::Other(format!("zip read: {e}")))?;
    let top = top_level_dir(&names)
        .ok_or_else(|| AppError::Other("not a GitHub zipball (no single wrapper directory)".into()))?;

    let parent = dest_root
        .parent()
        .ok_or_else(|| AppError::Other("vault root has no parent directory".into()))?;
    std::fs::create_dir_all(parent)?;

    let temp = parent.join(format!(".markup-tmp-{}-{}", std::process::id(), unique_id()));
    let _ = std::fs::remove_dir_all(&temp); // clear any stale temp from a prior crash
    std::fs::create_dir_all(&temp)?;

    let written = (|| -> AppResult<()> {
        for i in 0..archive.len() {
            let mut entry = archive
                .by_index(i)
                .map_err(|e| AppError::Other(format!("zip entry {i}: {e}")))?;
            let Some(rel) = vault_path(&entry.name().to_string(), &top) else {
                continue;
            };
            // Zip-slip defense: drop any entry whose stripped path isn't safe
            // before it's ever joined onto the temp root.
            if !is_safe_path(&rel) {
                continue;
            }
            let dest = temp.join(&rel);
            if let Some(dir) = dest.parent() {
                std::fs::create_dir_all(dir)?;
            }
            let mut buf = Vec::with_capacity(entry.size() as usize);
            entry.read_to_end(&mut buf)?;
            std::fs::write(&dest, &buf)?;
        }
        Ok(())
    })();

    if let Err(e) = written {
        let _ = std::fs::remove_dir_all(&temp);
        return Err(e);
    }
    swap_into_place(&temp, dest_root)?;
    Ok(())
}

/// Replace `dest` with the freshly-built `temp` tree. When `dest` already exists
/// (re-open / refresh), move the old copy aside first, swap, then drop it — so a
/// failed swap rolls back to the previous vault instead of destroying it.
fn swap_into_place(temp: &Path, dest: &Path) -> AppResult<()> {
    if !dest.exists() {
        std::fs::rename(temp, dest)?;
        return Ok(());
    }
    let parent = dest.parent().unwrap_or_else(|| Path::new("."));
    let leaf = dest.file_name().and_then(|s| s.to_str()).unwrap_or("vault");
    let backup = parent.join(format!(".{leaf}.old-{}-{}", std::process::id(), unique_id()));
    std::fs::rename(dest, &backup)?;
    match std::fs::rename(temp, dest) {
        Ok(()) => {
            let _ = std::fs::remove_dir_all(&backup);
            Ok(())
        }
        Err(e) => {
            let _ = std::fs::rename(&backup, dest); // roll back
            Err(AppError::Io(e))
        }
    }
}

// ---------------------------------------------------------------------------
// Manifest sidecar I/O
// ---------------------------------------------------------------------------

/// `.markup/manifest.json` under the vault root. `.markup` is on the scanner's
/// skip list, so the sidecar never lists or indexes.
fn meta_path(root: &Path) -> PathBuf {
    root.join(".markup").join("manifest.json")
}

fn write_meta(root: &Path, meta: &GitHubVaultMeta) -> AppResult<()> {
    let path = meta_path(root);
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let json = serde_json::to_vec_pretty(meta)
        .map_err(|e| AppError::Other(format!("manifest encode: {e}")))?;
    std::fs::write(&path, json)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Networking + the command
// ---------------------------------------------------------------------------

fn http_status_error(status: reqwest::StatusCode) -> AppError {
    let code = status.as_u16();
    AppError::Other(match code {
        404 => "Repository not found — check owner/repo, or sign in to open a private repo.".into(),
        401 => "GitHub sign-in expired — please sign in again.".into(),
        403 => "GitHub rate limit reached — sign in or try again later.".into(),
        _ => format!("GitHub request failed (HTTP {code})."),
    })
}

/// Apply the shared GitHub API headers (+ bearer token when signed in).
fn with_headers(req: reqwest::RequestBuilder, token: Option<&str>) -> reqwest::RequestBuilder {
    let req = req
        .header("User-Agent", USER_AGENT)
        .header("X-GitHub-Api-Version", API_VERSION);
    match token {
        Some(t) => req.header("Authorization", format!("Bearer {t}")),
        None => req,
    }
}

/// The repo's default branch name (used when the caller pins no ref).
async fn default_branch(
    client: &reqwest::Client,
    token: Option<&str>,
    owner: &str,
    repo: &str,
) -> AppResult<String> {
    let url = format!("https://api.github.com/repos/{owner}/{repo}");
    let resp = with_headers(client.get(&url).header("Accept", "application/vnd.github+json"), token)
        .send()
        .await
        .map_err(|e| AppError::Other(format!("network: {e}")))?;
    if !resp.status().is_success() {
        return Err(http_status_error(resp.status()));
    }
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::Other(format!("parse repo: {e}")))?;
    json.get("default_branch")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .ok_or_else(|| AppError::Other("could not determine the repository's default branch".into()))
}

/// Resolve `git_ref` (or the default branch) to an exact commit SHA, returning
/// both. Pinning the zipball + tree to one commit keeps the working copy and its
/// manifest consistent. Uses the `application/vnd.github.sha` media type, which
/// returns the commit SHA as the plain-text body.
async fn resolve_commit(
    client: &reqwest::Client,
    token: Option<&str>,
    owner: &str,
    repo: &str,
    git_ref: Option<&str>,
) -> AppResult<(String, String)> {
    let ref_name = match git_ref {
        Some(r) if !r.is_empty() => r.to_string(),
        _ => default_branch(client, token, owner, repo).await?,
    };
    // Git ref names are URL-path-safe (no spaces/`?`/`#`), and `/` is meaningful
    // here (`commits/feature/x`), so the ref goes into the path verbatim.
    let url = format!("https://api.github.com/repos/{owner}/{repo}/commits/{ref_name}");
    let resp = with_headers(client.get(&url).header("Accept", "application/vnd.github.sha"), token)
        .send()
        .await
        .map_err(|e| AppError::Other(format!("network: {e}")))?;
    if !resp.status().is_success() {
        return Err(http_status_error(resp.status()));
    }
    let sha = resp
        .text()
        .await
        .map_err(|e| AppError::Other(format!("read commit sha: {e}")))?
        .trim()
        .to_string();
    if sha.is_empty() {
        return Err(AppError::Other("GitHub returned an empty commit SHA".into()));
    }
    Ok((ref_name, sha))
}

/// Download a repo's zipball bytes, pinned to a commit SHA (always URL-safe).
async fn download_zipball(
    client: &reqwest::Client,
    token: Option<&str>,
    owner: &str,
    repo: &str,
    sha: &str,
) -> AppResult<Vec<u8>> {
    let url = format!("https://api.github.com/repos/{owner}/{repo}/zipball/{sha}");
    let resp = with_headers(client.get(&url).header("Accept", "application/vnd.github+json"), token)
        .send()
        .await
        .map_err(|e| AppError::Other(format!("network: {e}")))?;
    if !resp.status().is_success() {
        return Err(http_status_error(resp.status()));
    }
    // Size guard (design §5): bail before buffering an oversized archive.
    if let Some(len) = resp.content_length() {
        if len > MAX_ZIPBALL_BYTES {
            return Err(oversize_error(len));
        }
    }
    let bytes = resp
        .bytes()
        .await
        .map_err(|e| AppError::Other(format!("download: {e}")))?;
    if bytes.len() as u64 > MAX_ZIPBALL_BYTES {
        return Err(oversize_error(bytes.len() as u64));
    }
    Ok(bytes.to_vec())
}

fn oversize_error(len: u64) -> AppError {
    AppError::Other(format!(
        "this repository's archive is {} MB, over the {} MB limit — Markup is built for docs-sized repos",
        len / (1024 * 1024),
        MAX_ZIPBALL_BYTES / (1024 * 1024),
    ))
}

/// Fetch the recursive git-tree at `sha` and parse it into a manifest.
async fn fetch_tree(
    client: &reqwest::Client,
    token: Option<&str>,
    owner: &str,
    repo: &str,
    sha: &str,
) -> AppResult<RepoManifest> {
    let url = format!("https://api.github.com/repos/{owner}/{repo}/git/trees/{sha}?recursive=1");
    let resp = with_headers(client.get(&url).header("Accept", "application/vnd.github+json"), token)
        .send()
        .await
        .map_err(|e| AppError::Other(format!("network: {e}")))?;
    if !resp.status().is_success() {
        return Err(http_status_error(resp.status()));
    }
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::Other(format!("parse tree: {e}")))?;
    parse_tree_api(&json).ok_or_else(|| AppError::Other("could not parse the repository tree".into()))
}

/// The local cache directory for a repo's vault:
/// `<app_cache>/github/<owner>/<refSlug>/<repo>`.
fn vault_root(app: &AppHandle, owner: &str, repo: &str, git_ref: &str) -> AppResult<PathBuf> {
    let cache = app
        .path()
        .app_cache_dir()
        .map_err(|e| AppError::Other(format!("app_cache_dir: {e}")))?;
    let mut p = cache.join("github");
    for c in vault_path_components(owner, repo, Some(git_ref)) {
        p = p.join(c);
    }
    Ok(p)
}

/// Where the materialized repo landed, handed back so the frontend can open it
/// through the normal `open_vault` flow (and remember it in recents).
#[derive(Debug, Serialize)]
pub struct GitHubVaultOpened {
    pub root: String,
    pub owner: String,
    pub repo: String,
    /// The resolved ref name (branch/tag the SHA came from), for display.
    pub git_ref: String,
}

/// Download `owner/repo` (at `git_ref`, or the default branch) as a local vault
/// and return its path. The frontend then calls the existing `open_vault` on it
/// — the vault UI needs zero changes. Phase progress is emitted on the
/// `github-vault-progress` event; indexing progress is the existing
/// `vault-index-progress` once `open_vault` runs.
#[tauri::command]
pub async fn github_open_repo_vault(
    app: AppHandle,
    owner: String,
    repo: String,
    git_ref: Option<String>,
) -> AppResult<GitHubVaultOpened> {
    let token = crate::token_store::load_token();
    let client = reqwest::Client::new();
    let emit = |phase: &str| {
        let _ = app.emit("github-vault-progress", phase);
    };

    emit("resolving");
    let (ref_name, sha) =
        resolve_commit(&client, token.as_deref(), &owner, &repo, git_ref.as_deref()).await?;

    emit("downloading");
    let bytes = download_zipball(&client, token.as_deref(), &owner, &repo, &sha).await?;

    emit("extracting");
    let root = vault_root(&app, &owner, &repo, &ref_name)?;
    let root_for_extract = root.clone();
    // Decompress + write off the async runtime — a whole repo is blocking work.
    tokio::task::spawn_blocking(move || extract_zipball(&bytes, &root_for_extract))
        .await
        .map_err(|e| AppError::Other(format!("extract task: {e}")))??;

    emit("manifest");
    // Snapshot the tree manifest (best-effort): a failure here only means the
    // first refresh re-downloads the whole zipball instead of diffing.
    if let Ok(manifest) = fetch_tree(&client, token.as_deref(), &owner, &repo, &sha).await {
        let meta = GitHubVaultMeta {
            link: GitHubVaultLink {
                owner: owner.clone(),
                repo: repo.clone(),
                git_ref: Some(ref_name.clone()),
            },
            manifest,
        };
        let _ = write_meta(&root, &meta);
    }

    emit("done");
    Ok(GitHubVaultOpened {
        root: root.to_string_lossy().into_owned(),
        owner,
        repo,
        git_ref: ref_name,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    // --- top_level_dir ---------------------------------------------------

    #[test]
    fn top_level_dir_finds_single_wrapper() {
        let paths = vec![
            "owner-repo-abc/".to_string(),
            "owner-repo-abc/README.md".to_string(),
            "owner-repo-abc/docs/guide.md".to_string(),
        ];
        assert_eq!(top_level_dir(&paths), Some("owner-repo-abc".to_string()));
    }

    #[test]
    fn top_level_dir_rejects_multiple_roots() {
        let paths = vec!["a/x.md".to_string(), "b/y.md".to_string()];
        assert_eq!(top_level_dir(&paths), None);
    }

    // --- vault_path ------------------------------------------------------

    #[test]
    fn vault_path_strips_wrapper_and_drops_dirs() {
        assert_eq!(vault_path("w/README.md", "w"), Some("README.md".to_string()));
        assert_eq!(vault_path("w/a/b.md", "w"), Some("a/b.md".to_string()));
        assert_eq!(vault_path("w/", "w"), None); // wrapper dir itself
        assert_eq!(vault_path("w/sub/", "w"), None); // a directory entry
        assert_eq!(vault_path("other/x.md", "w"), None); // outside the wrapper
    }

    // --- vault_path_components -------------------------------------------

    #[test]
    fn vault_components_order_slug_and_fallbacks() {
        assert_eq!(
            vault_path_components("oratis", "Markup", Some("main")),
            ["oratis".to_string(), "main".to_string(), "Markup".to_string()]
        );
        // ref with a slash is slugified so it stays one component.
        assert_eq!(
            vault_path_components("o", "r", Some("feature/x"))[1],
            "feature-x"
        );
        // empty ref → "default"; traversal-y components → fallbacks.
        assert_eq!(vault_path_components("o", "r", None)[1], "default");
        assert_eq!(vault_path_components("..", "..", Some(".."))[0], "_");
    }

    // --- is_safe_path ----------------------------------------------------

    #[test]
    fn is_safe_path_rejects_traversal() {
        assert!(is_safe_path("a/b.md"));
        assert!(!is_safe_path("../evil.md"));
        assert!(!is_safe_path("/abs.md"));
        assert!(!is_safe_path("a/../../b.md"));
        assert!(!is_safe_path("a//b.md"));
        assert!(!is_safe_path(""));
    }

    // --- parse_tree_api --------------------------------------------------

    #[test]
    fn parse_tree_keeps_blobs_skips_trees_and_unsafe() {
        let json = serde_json::json!({
            "sha": "treesha",
            "truncated": false,
            "tree": [
                { "path": "README.md", "type": "blob", "sha": "aaa", "size": 12 },
                { "path": "docs", "type": "tree", "sha": "ddd" },
                { "path": "docs/guide.md", "type": "blob", "sha": "bbb", "size": 34 },
                { "path": "sub", "type": "commit", "sha": "ccc" },
                { "path": "../escape.md", "type": "blob", "sha": "eee", "size": 1 }
            ]
        });
        let m = parse_tree_api(&json).unwrap();
        assert_eq!(m.tree_sha, "treesha");
        assert!(!m.truncated);
        assert_eq!(m.blobs.len(), 2); // README.md + docs/guide.md only
        assert_eq!(m.blobs["README.md"].sha, "aaa");
        assert_eq!(m.blobs["docs/guide.md"].size, 34);
        assert!(!m.blobs.contains_key("../escape.md"));
    }

    #[test]
    fn parse_tree_none_without_tree_array() {
        assert!(parse_tree_api(&serde_json::json!({ "sha": "x" })).is_none());
    }

    #[test]
    fn manifest_round_trips_through_json() {
        let json = serde_json::json!({
            "sha": "t", "truncated": false,
            "tree": [{ "path": "a.md", "type": "blob", "sha": "s", "size": 3 }]
        });
        let m = parse_tree_api(&json).unwrap();
        let meta = GitHubVaultMeta {
            link: GitHubVaultLink {
                owner: "o".into(),
                repo: "r".into(),
                git_ref: Some("main".into()),
            },
            manifest: m.clone(),
        };
        let s = serde_json::to_string(&meta).unwrap();
        let back: GitHubVaultMeta = serde_json::from_str(&s).unwrap();
        assert_eq!(back.manifest, m);
        assert_eq!(back.link.git_ref.as_deref(), Some("main"));
        assert!(s.contains("\"ref\":")); // serialized under the git name
    }

    // --- extract_zipball -------------------------------------------------

    /// Build an in-memory zip (Stored, so no codec feature is needed for tests).
    fn make_zip(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut buf = Vec::new();
        {
            let mut w = zip::ZipWriter::new(std::io::Cursor::new(&mut buf));
            let opts = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Stored);
            for (name, data) in entries {
                if let Some(dir) = name.strip_suffix('/') {
                    w.add_directory(dir, opts).unwrap();
                } else {
                    w.start_file(*name, opts).unwrap();
                    w.write_all(data).unwrap();
                }
            }
            w.finish().unwrap();
        }
        buf
    }

    #[test]
    fn extract_strips_wrapper_and_rejects_traversal() {
        let zip = make_zip(&[
            ("owner-repo-abc/", b""),
            ("owner-repo-abc/README.md", b"# Hi"),
            ("owner-repo-abc/docs/", b""),
            ("owner-repo-abc/docs/guide.md", b"guide"),
            // A zip-slip entry — must be dropped, never written to the parent.
            ("owner-repo-abc/../evil.md", b"escape"),
        ]);
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("vault");
        extract_zipball(&zip, &root).unwrap();

        assert_eq!(std::fs::read_to_string(root.join("README.md")).unwrap(), "# Hi");
        assert_eq!(std::fs::read_to_string(root.join("docs/guide.md")).unwrap(), "guide");
        assert!(!tmp.path().join("evil.md").exists(), "traversal entry escaped!");
        assert!(!root.join("../evil.md").exists());
    }

    #[test]
    fn extract_rejects_non_zipball_without_single_root() {
        let zip = make_zip(&[("a/x.md", b"1"), ("b/y.md", b"2")]);
        let tmp = tempfile::tempdir().unwrap();
        assert!(extract_zipball(&zip, &tmp.path().join("vault")).is_err());
    }

    #[test]
    fn re_extract_replaces_existing_vault_atomically() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("vault");
        extract_zipball(
            &make_zip(&[("o-r-1/", b""), ("o-r-1/a.md", b"A"), ("o-r-1/old.md", b"OLD")]),
            &root,
        )
        .unwrap();
        assert!(root.join("old.md").exists());

        // Re-extract a newer snapshot that dropped old.md and changed a.md.
        extract_zipball(&make_zip(&[("o-r-2/", b""), ("o-r-2/a.md", b"A2")]), &root).unwrap();
        assert_eq!(std::fs::read_to_string(root.join("a.md")).unwrap(), "A2");
        assert!(!root.join("old.md").exists(), "stale file survived re-extract");
        // No temp/backup litter left in the parent.
        let leftovers: Vec<_> = std::fs::read_dir(tmp.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().starts_with(".markup-tmp"))
            .collect();
        assert!(leftovers.is_empty(), "temp dir not cleaned up");
    }
}
