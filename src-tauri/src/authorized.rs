//! Write-scope guard: the set of directories the user has granted this
//! session write access to.
//!
//! `read_file` keeps its extension check and is otherwise unrestricted (a read
//! is low-risk), but every successful read/open *registers the file's parent
//! directory* — so the common "open a file, edit it, save it" loop authorizes
//! itself with no frontend bookkeeping. Opening a vault authorizes its whole
//! tree. The destructive commands (`write_file`, `rename_file`, `write_image`)
//! refuse any target that doesn't resolve inside an authorized directory,
//! which stops a compromised webview from overwriting arbitrary files on disk
//! (the previous behaviour: any absolute path with a markdown-ish extension).

use crate::error::{AppError, AppResult};
use parking_lot::Mutex;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use tauri::State;

#[derive(Default)]
pub struct WriteScope {
    dirs: Mutex<HashSet<PathBuf>>,
}

impl WriteScope {
    pub fn new() -> Self {
        Self::default()
    }

    /// Grant write access to `dir` and everything beneath it. Stored canonical
    /// so a later `..`/symlink target can't widen the granted scope.
    pub fn authorize_dir(&self, dir: &Path) {
        if let Ok(c) = std::fs::canonicalize(dir) {
            if c.is_dir() {
                self.dirs.lock().insert(c);
            }
        }
    }

    /// Grant write access to the directory holding `file`. Called after a
    /// successful read/open so the file can be saved back (and siblings in the
    /// same folder created, e.g. Save As alongside it).
    pub fn authorize_file(&self, file: &Path) {
        if let Some(parent) = file.parent() {
            self.authorize_dir(parent);
        }
    }

    /// True if `path` resolves inside an authorized directory. Works for a
    /// not-yet-created target (new file, rename destination) by resolving its
    /// existing parent and re-appending the final component.
    pub fn is_allowed(&self, path: &Path) -> bool {
        let Some(target) = resolve_for_check(path) else {
            return false;
        };
        let dirs = self.dirs.lock();
        dirs.iter().any(|d| target.starts_with(d))
    }

    /// `Ok(())` if allowed, else an `Unauthorized` error naming the path.
    pub fn ensure_allowed(&self, path: &Path) -> AppResult<()> {
        if self.is_allowed(path) {
            Ok(())
        } else {
            Err(AppError::Unauthorized(path.display().to_string()))
        }
    }
}

/// Resolve `path` to an absolute, symlink-free form for prefix comparison.
/// Existing path → canonicalize directly. Missing path (new file / rename
/// destination) → canonicalize the parent (which must exist) and re-append the
/// final component, so a brand-new file inside an authorized dir resolves into
/// that dir and any `..` segments are collapsed before the check.
fn resolve_for_check(path: &Path) -> Option<PathBuf> {
    if let Ok(c) = std::fs::canonicalize(path) {
        return Some(c);
    }
    let parent = path.parent()?;
    let name = path.file_name()?;
    let cparent = std::fs::canonicalize(parent).ok()?;
    Some(cparent.join(name))
}

/// Frontend-driven grant: the user picked these paths through an OS dialog
/// (e.g. Save As), which is an explicit authorization to write them.
#[tauri::command]
pub fn authorize_paths(scope: State<'_, WriteScope>, paths: Vec<String>) -> AppResult<()> {
    for p in paths {
        scope.authorize_file(Path::new(&p));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn allows_existing_file_inside_authorized_dir() {
        let dir = tempdir().unwrap();
        let scope = WriteScope::new();
        scope.authorize_dir(dir.path());
        let f = dir.path().join("note.md");
        std::fs::write(&f, "x").unwrap();
        assert!(scope.is_allowed(&f));
    }

    #[test]
    fn allows_new_file_in_authorized_dir() {
        let dir = tempdir().unwrap();
        let scope = WriteScope::new();
        scope.authorize_dir(dir.path());
        // The file doesn't exist yet (the Save As / new-file case).
        assert!(scope.is_allowed(&dir.path().join("new.md")));
    }

    #[test]
    fn rejects_path_in_unauthorized_dir() {
        let dir = tempdir().unwrap();
        let other = tempdir().unwrap();
        let scope = WriteScope::new();
        scope.authorize_dir(dir.path());
        let f = other.path().join("secret.md");
        std::fs::write(&f, "x").unwrap();
        assert!(!scope.is_allowed(&f));
        assert!(scope.ensure_allowed(&f).is_err());
    }

    #[test]
    fn rejects_traversal_escape_from_authorized_dir() {
        let parent = tempdir().unwrap();
        let vault = parent.path().join("vault");
        std::fs::create_dir(&vault).unwrap();
        let outside = parent.path().join("outside.md");
        std::fs::write(&outside, "x").unwrap();
        let scope = WriteScope::new();
        scope.authorize_dir(&vault);
        // vault/../outside.md resolves outside the authorized dir → rejected.
        let escape = vault.join("..").join("outside.md");
        assert!(!scope.is_allowed(&escape));
    }

    #[test]
    fn authorize_file_grants_its_parent_dir() {
        let dir = tempdir().unwrap();
        let f = dir.path().join("a.md");
        std::fs::write(&f, "x").unwrap();
        let scope = WriteScope::new();
        scope.authorize_file(&f);
        // A sibling in the same folder is now writable (Save As next to it).
        let sibling = dir.path().join("b.md");
        std::fs::write(&sibling, "y").unwrap();
        assert!(scope.is_allowed(&sibling));
    }

    #[test]
    fn empty_scope_allows_nothing() {
        let dir = tempdir().unwrap();
        let f = dir.path().join("note.md");
        std::fs::write(&f, "x").unwrap();
        let scope = WriteScope::new();
        assert!(!scope.is_allowed(&f));
    }
}
