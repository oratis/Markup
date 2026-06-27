//! GitHub access-token storage in the OS credential store.
//!
//! The desktop frontend used to keep the OAuth token in the webview's
//! `localStorage`, where any script running in the webview could read it.
//! These commands move it into the platform credential store (via the
//! `keyring` crate — Keychain on macOS, Credential Manager on Windows, Secret
//! Service on Linux), keyed by the app's bundle identifier. The frontend
//! mirrors the value in a synchronous in-memory cache and calls these to
//! hydrate / persist it.
//!
//! ## Linux headless fallback
//!
//! Secret Service needs a running keyring daemon (gnome-keyring / KWallet),
//! which a headless or server box may not have. There, a user on a trusted
//! single-user machine can opt in with `MARKUP_TOKEN_FILE_FALLBACK=1` to store
//! the token in a `0600` file under `$XDG_DATA_HOME` instead. This is **weaker
//! than the system keyring** (a local process running as the same user can read
//! the file), but it still keeps the token out of the webview — the threat the
//! keyring move was made to address — and unblocks GitHub features. It is
//! **opt-in on purpose**: we never silently downgrade to on-disk storage.

use keyring::{Entry, Error as KeyringError};

/// Keychain service — the app bundle identifier (see `tauri.conf.json`).
const SERVICE: &str = "com.appkon.markup";
/// Account name under that service.
const ACCOUNT: &str = "github-access-token";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(annotate)
}

/// On Linux, append an actionable hint about the headless file fallback to
/// keyring errors (the common cause is "no Secret Service daemon running").
/// A no-op on macOS/Windows.
#[cfg(target_os = "linux")]
fn annotate(e: impl std::fmt::Display) -> String {
    format!(
        "{e}. If this machine has no Secret Service keyring (headless/server), \
         set MARKUP_TOKEN_FILE_FALLBACK=1 to store the token in a 0600 file under \
         $XDG_DATA_HOME (less secure than the system keyring)."
    )
}

#[cfg(not(target_os = "linux"))]
fn annotate(e: impl std::fmt::Display) -> String {
    e.to_string()
}

/// Read the stored token, or `None` when nothing is saved.
#[tauri::command]
pub fn github_token_load() -> Result<Option<String>, String> {
    #[cfg(target_os = "linux")]
    if file_fallback::enabled() {
        return file_fallback::load();
    }
    match entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(e) => Err(annotate(e)),
    }
}

/// Persist the token, overwriting any existing one.
#[tauri::command]
pub fn github_token_save(token: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if file_fallback::enabled() {
        return file_fallback::save(&token);
    }
    entry()?.set_password(&token).map_err(annotate)
}

/// Delete the stored token. Idempotent — a missing entry is treated as success.
#[tauri::command]
pub fn github_token_delete() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if file_fallback::enabled() {
        return file_fallback::delete();
    }
    match entry()?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(e) => Err(annotate(e)),
    }
}

/// Opt-in plaintext token file for Linux headless boxes without a Secret
/// Service daemon. See the module docs for the threat-model rationale.
///
/// Compiled on all Unix so its logic is unit-tested on the macOS CI host, but
/// only **activated** on Linux — see the `#[cfg(target_os = "linux")]` call
/// sites in the command fns above.
#[cfg(unix)]
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
mod file_fallback {
    use std::fs;
    use std::io::Write;
    use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
    use std::path::PathBuf;

    /// True iff the user explicitly opted into the file fallback.
    pub fn enabled() -> bool {
        matches!(
            std::env::var("MARKUP_TOKEN_FILE_FALLBACK").as_deref(),
            Ok("1") | Ok("true")
        )
    }

    /// `$XDG_DATA_HOME/<service>/github-token`, falling back to
    /// `$HOME/.local/share/<service>/github-token`.
    fn path() -> Result<PathBuf, String> {
        let base = std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .filter(|p| p.is_absolute())
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")))
            .ok_or_else(|| "no XDG_DATA_HOME or HOME for the token file fallback".to_string())?;
        Ok(base.join(super::SERVICE).join("github-token"))
    }

    pub fn load() -> Result<Option<String>, String> {
        let p = path()?;
        match fs::read_to_string(&p) {
            Ok(s) => {
                let token = s.trim();
                Ok(if token.is_empty() {
                    None
                } else {
                    Some(token.to_string())
                })
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn save(token: &str) -> Result<(), String> {
        let p = path()?;
        if let Some(dir) = p.parent() {
            fs::create_dir_all(dir).map_err(|e| e.to_string())?;
            // Best-effort tighten the parent dir to owner-only.
            let _ = fs::set_permissions(dir, fs::Permissions::from_mode(0o700));
        }
        // Create/truncate with 0600 from the start, so the token is never
        // briefly world-readable.
        let mut f = fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(&p)
            .map_err(|e| e.to_string())?;
        f.write_all(token.as_bytes()).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete() -> Result<(), String> {
        match fs::remove_file(path()?) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn roundtrip_via_xdg_data_home() {
            let tmp = std::env::temp_dir().join(format!("markup-tok-{}", std::process::id()));
            let _ = fs::remove_dir_all(&tmp);
            // SAFETY: single-threaded test; we set XDG_DATA_HOME for this process.
            unsafe { std::env::set_var("XDG_DATA_HOME", &tmp) };

            assert_eq!(load().unwrap(), None, "empty before save");
            save("ghp_example").unwrap();
            assert_eq!(load().unwrap(), Some("ghp_example".to_string()));

            // File must be owner-only (0600).
            let mode = fs::metadata(path().unwrap()).unwrap().permissions().mode();
            assert_eq!(mode & 0o777, 0o600);

            delete().unwrap();
            assert_eq!(load().unwrap(), None, "empty after delete");
            delete().unwrap(); // idempotent

            let _ = fs::remove_dir_all(&tmp);
        }
    }
}
