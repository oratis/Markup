//! GitHub access-token storage in the macOS login Keychain.
//!
//! The desktop frontend used to keep the OAuth token in the webview's
//! `localStorage`, where any script running in the webview could read it.
//! These commands move it into the Keychain (via the `keyring` crate's
//! Security-framework backend), keyed by the app's bundle identifier. The
//! frontend mirrors the value in a synchronous in-memory cache and calls
//! these to hydrate / persist it.

use keyring::{Entry, Error as KeyringError};

/// Keychain service — the app bundle identifier (see `tauri.conf.json`).
const SERVICE: &str = "com.appkon.markup";
/// Account name under that service.
const ACCOUNT: &str = "github-access-token";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())
}

/// Read the stored token, or `None` when nothing is saved.
#[tauri::command]
pub fn github_token_load() -> Result<Option<String>, String> {
    match entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Persist the token, overwriting any existing one.
#[tauri::command]
pub fn github_token_save(token: String) -> Result<(), String> {
    entry()?.set_password(&token).map_err(|e| e.to_string())
}

/// Delete the stored token. Idempotent — a missing entry is treated as success.
#[tauri::command]
pub fn github_token_delete() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
