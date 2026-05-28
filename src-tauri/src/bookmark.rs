//! macOS security-scoped bookmarks for App Sandbox (Mac App Store) builds.
//!
//! Under the sandbox, the access a user grants by picking a folder in the
//! open panel lasts only for the session. To re-open that vault on the
//! next launch we capture a *security-scoped bookmark* while access is
//! live, persist it, and on the next launch resolve it and call
//! `startAccessingSecurityScopedResource` — which re-grants access
//! process-wide, so our plain `std::fs` vault scanner/reader works again.
//!
//! Non-sandboxed (direct-download) builds don't need any of this: `std::fs`
//! can read anywhere. There, `create()` returns `None` and the caller
//! persists just the plain path (which resolves directly on relaunch).

#[cfg(target_os = "macos")]
pub fn create(path: &str) -> Option<Vec<u8>> {
    use objc2_foundation::{NSString, NSURL, NSURLBookmarkCreationOptions};
    let ns_path = NSString::from_str(path);
    let url = NSURL::fileURLWithPath(&ns_path);
    let data = url
        .bookmarkDataWithOptions_includingResourceValuesForKeys_relativeToURL_error(
            NSURLBookmarkCreationOptions::WithSecurityScope,
            None,
            None,
        )
        .ok()?;
    Some(data.to_vec())
}

/// Resolve a bookmark, start accessing the security-scoped resource, and
/// return the folder path. The resolved `NSURL` is intentionally leaked so
/// the access it holds persists for the whole process — the vault stays
/// open for the session, so there's nothing to balance a `stop` against.
#[cfg(target_os = "macos")]
pub fn resolve_and_start(bytes: &[u8]) -> Option<String> {
    use objc2_foundation::{NSData, NSURL, NSURLBookmarkResolutionOptions};
    let data = NSData::with_bytes(bytes);
    let url = unsafe {
        NSURL::URLByResolvingBookmarkData_options_relativeToURL_bookmarkDataIsStale_error(
            &data,
            NSURLBookmarkResolutionOptions::WithSecurityScope,
            None,
            std::ptr::null_mut(),
        )
    }
    .ok()?;
    let started = unsafe { url.startAccessingSecurityScopedResource() };
    if !started {
        return None;
    }
    let path = url.path().map(|p| p.to_string());
    // Keep the security-scoped access alive: dropping the NSURL would
    // implicitly stop it. We want it for the lifetime of the process.
    std::mem::forget(url);
    path
}

// --- Non-macOS stubs: no sandbox, std::fs is unrestricted ---

#[cfg(not(target_os = "macos"))]
pub fn create(_path: &str) -> Option<Vec<u8>> {
    None
}

#[cfg(not(target_os = "macos"))]
pub fn resolve_and_start(_bytes: &[u8]) -> Option<String> {
    None
}
