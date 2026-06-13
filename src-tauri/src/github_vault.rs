//! B301 — open a GitHub repo as a local vault (download-first).
//!
//! Mirrors the shipped iOS pipeline (docs/design/06-github-roundtrip.md):
//! download the repo zipball, extract it atomically into the app cache,
//! write a `.markup/manifest.json` pinning the commit + per-file blob SHAs,
//! and hand the directory to the existing `open_vault` flow. Refresh (B303)
//! and write-back (B304+) build on the manifest.

use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::error::{AppError, AppResult};

/// Progress payload emitted as `github-vault-progress` while a repo is being
/// downloaded / extracted. `total` is 0 when the size isn't known up front.
#[derive(Clone, Serialize)]
pub struct GitHubVaultProgress {
    pub phase: &'static str,
    pub done: u64,
    pub total: u64,
}

fn emit_progress(app: &AppHandle, phase: &'static str, done: u64, total: u64) {
    let _ = app.emit(
        "github-vault-progress",
        GitHubVaultProgress { phase, done, total },
    );
}

/// One blob in the pinned tree snapshot.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ManifestEntry {
    pub path: String,
    pub sha: String,
    pub size: u64,
}

/// `.markup/manifest.json` — the base state a GitHub vault was materialized
/// from. Edit tracking (B304) diffs files against `entries[].sha`; refresh
/// (B303) diffs a fresh tree against it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubVaultManifest {
    pub owner: String,
    pub repo: String,
    #[serde(rename = "ref")]
    pub ref_name: String,
    pub commit_sha: String,
    pub entries: Vec<ManifestEntry>,
}

pub const MANIFEST_DIR: &str = ".markup";
pub const MANIFEST_FILE: &str = "manifest.json";

/// Max zipball size we will download without refusing (decompressed repos
/// can be much larger; this guards the obvious "pointed it at a monorepo"
/// case — see design §5).
const MAX_ZIPBALL_BYTES: u64 = 200 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

/// Map a zipball entry name to a vault-relative path.
///
/// GitHub zipballs wrap everything in a single `repo-<sha>/` directory —
/// strip that first component. Returns:
/// - `Ok(None)` for entries to skip silently (the wrapper itself, empty
///   remainders, directory placeholders),
/// - `Err(..)` for entries that must abort the whole extraction (absolute
///   paths, `..` traversal, drive prefixes — a malicious archive should not
///   half-extract),
/// - `Ok(Some(rel))` for a safe relative file path.
pub fn zip_entry_rel_path(raw: &str) -> AppResult<Option<PathBuf>> {
    let name = raw.trim_end_matches('/');
    if name.is_empty() {
        return Ok(None);
    }
    let p = Path::new(name);
    let mut comps = p.components();
    // Drop the wrapper directory (first component).
    let first = comps.next();
    match first {
        Some(Component::Normal(_)) => {}
        // Anything else as the FIRST component is hostile or malformed.
        _ => {
            return Err(AppError::Other(format!(
                "zip entry has an unsafe path: {raw}"
            )))
        }
    }
    let mut rel = PathBuf::new();
    for c in comps {
        match c {
            Component::Normal(part) => rel.push(part),
            Component::CurDir => {}
            _ => {
                return Err(AppError::Other(format!(
                    "zip entry has an unsafe path: {raw}"
                )))
            }
        }
    }
    if rel.as_os_str().is_empty() {
        return Ok(None); // the wrapper dir itself
    }
    Ok(Some(rel))
}

/// Extract a GitHub zipball into `dest` atomically: contents land in a
/// sibling `<dest>.partial` first, which is renamed to `dest` only after
/// every entry extracted cleanly. Returns the number of files written.
pub fn extract_zipball(zip_path: &Path, dest: &Path) -> AppResult<usize> {
    let file = fs::File::open(zip_path)?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| AppError::Other(format!("zip open failed: {e}")))?;

    let partial = partial_dir_for(dest);
    if partial.exists() {
        fs::remove_dir_all(&partial)?;
    }
    fs::create_dir_all(&partial)?;

    let mut written = 0usize;
    let result: AppResult<()> = (|| {
        for i in 0..archive.len() {
            let mut entry = archive
                .by_index(i)
                .map_err(|e| AppError::Other(format!("zip read failed: {e}")))?;
            let raw = entry.name().to_string();
            if entry.is_dir() {
                // Directories are created on demand from file paths.
                zip_entry_rel_path(&raw)?; // still validate hostile names
                continue;
            }
            let Some(rel) = zip_entry_rel_path(&raw)? else {
                continue;
            };
            let out = partial.join(&rel);
            if let Some(parent) = out.parent() {
                fs::create_dir_all(parent)?;
            }
            let mut f = fs::File::create(&out)?;
            io::copy(&mut entry, &mut f)?;
            written += 1;
        }
        Ok(())
    })();

    if let Err(e) = result {
        let _ = fs::remove_dir_all(&partial);
        return Err(e);
    }

    if dest.exists() {
        fs::remove_dir_all(dest)?;
    }
    fs::rename(&partial, dest)?;
    Ok(written)
}

fn partial_dir_for(dest: &Path) -> PathBuf {
    let mut name = dest
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "vault".into());
    name.push_str(".partial");
    dest.with_file_name(name)
}

/// Write `.markup/manifest.json` under the vault root.
pub fn write_manifest(vault_dir: &Path, manifest: &GitHubVaultManifest) -> AppResult<()> {
    let dir = vault_dir.join(MANIFEST_DIR);
    fs::create_dir_all(&dir)?;
    let json = serde_json::to_string_pretty(manifest)
        .map_err(|e| AppError::Other(format!("manifest serialize failed: {e}")))?;
    fs::write(dir.join(MANIFEST_FILE), json)?;
    Ok(())
}

/// Read the manifest back (used by B303 refresh / B304 status).
pub fn read_manifest(vault_dir: &Path) -> AppResult<GitHubVaultManifest> {
    let raw = fs::read_to_string(vault_dir.join(MANIFEST_DIR).join(MANIFEST_FILE))?;
    serde_json::from_str(&raw).map_err(|e| AppError::Other(format!("manifest parse failed: {e}")))
}

// ---------------------------------------------------------------------------
// GitHub API (network; exercised manually + via B302 UI, not in CI)
// ---------------------------------------------------------------------------

const API: &str = "https://api.github.com";

fn http_client() -> AppResult<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent("Markup")
        .build()
        .map_err(|e| AppError::Other(format!("http client: {e}")))
}

fn auth_header(token: &Option<String>) -> Option<String> {
    token
        .as_ref()
        .filter(|t| !t.is_empty())
        .map(|t| format!("Bearer {t}"))
}

async fn api_get_json(
    client: &reqwest::Client,
    url: &str,
    token: &Option<String>,
) -> AppResult<serde_json::Value> {
    let mut req = client
        .get(url)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28");
    if let Some(h) = auth_header(token) {
        req = req.header("Authorization", h);
    }
    let resp = req
        .send()
        .await
        .map_err(|e| AppError::Other(format!("github request failed: {e}")))?;
    let status = resp.status();
    if !status.is_success() {
        return Err(AppError::Other(format!("github api {url}: HTTP {status}")));
    }
    resp.json::<serde_json::Value>()
        .await
        .map_err(|e| AppError::Other(format!("github response parse: {e}")))
}

/// Resolve the ref to use: the caller's, or the repo's default branch.
async fn resolve_ref(
    client: &reqwest::Client,
    owner: &str,
    repo: &str,
    ref_name: Option<String>,
    token: &Option<String>,
) -> AppResult<String> {
    if let Some(r) = ref_name.filter(|r| !r.is_empty()) {
        return Ok(r);
    }
    let v = api_get_json(client, &format!("{API}/repos/{owner}/{repo}"), token).await?;
    v.get("default_branch")
        .and_then(|b| b.as_str())
        .map(str::to_owned)
        .ok_or_else(|| AppError::Other("repo has no default_branch".into()))
}

/// Pin the ref to a commit and list every blob in its tree.
async fn fetch_tree(
    client: &reqwest::Client,
    owner: &str,
    repo: &str,
    ref_name: &str,
    token: &Option<String>,
) -> AppResult<(String, Vec<ManifestEntry>)> {
    let commit = api_get_json(
        client,
        &format!("{API}/repos/{owner}/{repo}/commits/{ref_name}"),
        token,
    )
    .await?;
    let commit_sha = commit
        .get("sha")
        .and_then(|s| s.as_str())
        .ok_or_else(|| AppError::Other("commit response missing sha".into()))?
        .to_owned();
    let tree_sha = commit
        .pointer("/commit/tree/sha")
        .and_then(|s| s.as_str())
        .ok_or_else(|| AppError::Other("commit response missing tree sha".into()))?
        .to_owned();

    let tree = api_get_json(
        client,
        &format!("{API}/repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1"),
        token,
    )
    .await?;
    let mut entries = Vec::new();
    if let Some(items) = tree.get("tree").and_then(|t| t.as_array()) {
        for it in items {
            let is_blob = it.get("type").and_then(|t| t.as_str()) == Some("blob");
            if !is_blob {
                continue;
            }
            let (Some(path), Some(sha)) = (
                it.get("path").and_then(|p| p.as_str()),
                it.get("sha").and_then(|s| s.as_str()),
            ) else {
                continue;
            };
            entries.push(ManifestEntry {
                path: path.to_owned(),
                sha: sha.to_owned(),
                size: it.get("size").and_then(|s| s.as_u64()).unwrap_or(0),
            });
        }
    }
    Ok((commit_sha, entries))
}

/// Download the zipball to a temp file next to the destination, emitting
/// download progress. Returns the temp path.
async fn download_zipball(
    app: &AppHandle,
    client: &reqwest::Client,
    owner: &str,
    repo: &str,
    ref_name: &str,
    token: &Option<String>,
    tmp_path: &Path,
) -> AppResult<()> {
    let url = format!("{API}/repos/{owner}/{repo}/zipball/{ref_name}");
    let mut req = client
        .get(&url)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28");
    if let Some(h) = auth_header(token) {
        req = req.header("Authorization", h);
    }
    let resp = req
        .send()
        .await
        .map_err(|e| AppError::Other(format!("zipball request failed: {e}")))?;
    let status = resp.status();
    if !status.is_success() {
        return Err(AppError::Other(format!("zipball {url}: HTTP {status}")));
    }
    let total = resp.content_length().unwrap_or(0);
    if total > MAX_ZIPBALL_BYTES {
        return Err(AppError::Other(format!(
            "repo zipball is {} MB — over the {} MB limit",
            total / (1024 * 1024),
            MAX_ZIPBALL_BYTES / (1024 * 1024)
        )));
    }
    if let Some(parent) = tmp_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut out = tokio::fs::File::create(tmp_path)
        .await
        .map_err(AppError::Io)?;
    let mut done: u64 = 0;
    let mut resp = resp;
    use tokio::io::AsyncWriteExt;
    while let Some(chunk) = resp
        .chunk()
        .await
        .map_err(|e| AppError::Other(format!("zipball download failed: {e}")))?
    {
        done += chunk.len() as u64;
        if done > MAX_ZIPBALL_BYTES {
            let _ = tokio::fs::remove_file(tmp_path).await;
            return Err(AppError::Other(
                "repo zipball exceeded the 200 MB limit mid-download".into(),
            ));
        }
        out.write_all(&chunk).await.map_err(AppError::Io)?;
        emit_progress(app, "download", done, total);
    }
    out.flush().await.map_err(AppError::Io)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/// Materialize `owner/repo@ref` into the app cache and return the local
/// vault directory. The frontend then runs the normal `open_vault` on it.
/// Already-materialized vaults return immediately (refresh is B303).
#[tauri::command]
pub async fn github_open_repo_vault(
    app: AppHandle,
    owner: String,
    repo: String,
    ref_name: Option<String>,
    token: Option<String>,
) -> AppResult<String> {
    if owner.is_empty() || repo.is_empty() {
        return Err(AppError::Other("owner and repo are required".into()));
    }
    let client = http_client()?;
    let ref_name = resolve_ref(&client, &owner, &repo, ref_name, &token).await?;

    let cache_root = app
        .path()
        .app_cache_dir()
        .map_err(|e| AppError::Other(format!("no cache dir: {e}")))?;
    // owner / ref / repo mirrors the iOS layout: ref-keyed, repo as the
    // display leaf (the folder name the vault UI shows).
    let vault_dir = cache_root
        .join("github")
        .join(&owner)
        .join(ref_name.replace('/', "_"))
        .join(&repo);

    if vault_dir.join(MANIFEST_DIR).join(MANIFEST_FILE).exists() {
        return Ok(vault_dir.to_string_lossy().into_owned());
    }

    emit_progress(&app, "download", 0, 0);
    let tmp_zip = vault_dir.with_extension("zip.part");
    download_zipball(&app, &client, &owner, &repo, &ref_name, &token, &tmp_zip).await?;

    emit_progress(&app, "extract", 0, 0);
    let dest = vault_dir.clone();
    let zip_for_task = tmp_zip.clone();
    let written = tokio::task::spawn_blocking(move || extract_zipball(&zip_for_task, &dest))
        .await
        .map_err(|e| AppError::Other(format!("extract task failed: {e}")))??;
    let _ = tokio::fs::remove_file(&tmp_zip).await;
    emit_progress(&app, "extract", written as u64, written as u64);

    emit_progress(&app, "manifest", 0, 0);
    let (commit_sha, entries) = fetch_tree(&client, &owner, &repo, &ref_name, &token).await?;
    let manifest = GitHubVaultManifest {
        owner,
        repo,
        ref_name,
        commit_sha,
        entries,
    };
    write_manifest(&vault_dir, &manifest)?;
    emit_progress(&app, "manifest", 1, 1);

    Ok(vault_dir.to_string_lossy().into_owned())
}

// ---------------------------------------------------------------------------
// Tests — offline: zips are built in-process, no network
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn build_zip(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut buf = Vec::new();
        {
            let mut w = zip::ZipWriter::new(std::io::Cursor::new(&mut buf));
            let opts: zip::write::SimpleFileOptions = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Stored);
            for (name, data) in entries {
                if name.ends_with('/') {
                    w.add_directory(name.trim_end_matches('/'), opts).unwrap();
                } else {
                    w.start_file(*name, opts).unwrap();
                    w.write_all(data).unwrap();
                }
            }
            w.finish().unwrap();
        }
        buf
    }

    fn write_zip(dir: &Path, entries: &[(&str, &[u8])]) -> PathBuf {
        let p = dir.join("test.zip");
        fs::write(&p, build_zip(entries)).unwrap();
        p
    }

    #[test]
    fn rel_path_strips_the_wrapper_dir() {
        let p = zip_entry_rel_path("repo-abc123/docs/readme.md").unwrap();
        assert_eq!(p, Some(PathBuf::from("docs/readme.md")));
    }

    #[test]
    fn rel_path_skips_wrapper_and_dir_entries() {
        assert_eq!(zip_entry_rel_path("repo-abc123/").unwrap(), None);
        assert_eq!(zip_entry_rel_path("repo-abc123").unwrap(), None);
        assert_eq!(zip_entry_rel_path("").unwrap(), None);
    }

    #[test]
    fn rel_path_rejects_traversal_and_absolute() {
        assert!(zip_entry_rel_path("repo/../../etc/passwd").is_err());
        assert!(zip_entry_rel_path("/etc/passwd").is_err());
        assert!(zip_entry_rel_path("repo/docs/../../../x").is_err());
        assert!(zip_entry_rel_path("../x").is_err());
    }

    #[test]
    fn extract_writes_files_under_dest_without_wrapper() {
        let tmp = tempfile::tempdir().unwrap();
        let zip = write_zip(
            tmp.path(),
            &[
                ("markup-abc/", b"" as &[u8]),
                ("markup-abc/README.md", b"# hi"),
                ("markup-abc/docs/", b""),
                ("markup-abc/docs/a.md", b"alpha"),
            ],
        );
        let dest = tmp.path().join("vault");
        let n = extract_zipball(&zip, &dest).unwrap();
        assert_eq!(n, 2);
        assert_eq!(fs::read_to_string(dest.join("README.md")).unwrap(), "# hi");
        assert_eq!(fs::read_to_string(dest.join("docs/a.md")).unwrap(), "alpha");
        assert!(!partial_dir_for(&dest).exists());
    }

    #[test]
    fn extract_aborts_whole_archive_on_zip_slip() {
        let tmp = tempfile::tempdir().unwrap();
        let zip = write_zip(
            tmp.path(),
            &[
                ("markup-abc/ok.md", b"fine" as &[u8]),
                ("markup-abc/../evil.md", b"bad"),
            ],
        );
        let dest = tmp.path().join("vault");
        assert!(extract_zipball(&zip, &dest).is_err());
        // Nothing half-extracted: neither dest nor the partial dir remains.
        assert!(!dest.exists());
        assert!(!partial_dir_for(&dest).exists());
        // And the hostile path was never written outside dest.
        assert!(!tmp.path().join("evil.md").exists());
    }

    #[test]
    fn extract_replaces_an_existing_dest_atomically() {
        let tmp = tempfile::tempdir().unwrap();
        let dest = tmp.path().join("vault");
        fs::create_dir_all(&dest).unwrap();
        fs::write(dest.join("stale.md"), "old").unwrap();
        let zip = write_zip(tmp.path(), &[("r-1/fresh.md", b"new" as &[u8])]);
        extract_zipball(&zip, &dest).unwrap();
        assert!(!dest.join("stale.md").exists());
        assert_eq!(fs::read_to_string(dest.join("fresh.md")).unwrap(), "new");
    }

    #[test]
    fn manifest_round_trips_through_disk() {
        let tmp = tempfile::tempdir().unwrap();
        let m = GitHubVaultManifest {
            owner: "oratis".into(),
            repo: "Markup".into(),
            ref_name: "main".into(),
            commit_sha: "deadbeef".into(),
            entries: vec![ManifestEntry {
                path: "docs/a.md".into(),
                sha: "abc".into(),
                size: 5,
            }],
        };
        write_manifest(tmp.path(), &m).unwrap();
        let back = read_manifest(tmp.path()).unwrap();
        assert_eq!(back.owner, "oratis");
        assert_eq!(back.ref_name, "main");
        assert_eq!(back.entries, m.entries);
        // The serialized key is `ref`, matching the iOS manifest shape.
        let raw = fs::read_to_string(tmp.path().join(MANIFEST_DIR).join(MANIFEST_FILE)).unwrap();
        assert!(raw.contains("\"ref\""));
    }
}
