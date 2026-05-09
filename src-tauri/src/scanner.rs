//! Walk a directory and collect markdown files. Used to seed the index when
//! the vault is opened.

use crate::error::AppResult;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Extensions we recognise as markdown.
const MD_EXT: &[&str] = &["md", "markdown", "mdx", "mkd"];

#[inline]
pub fn is_markdown(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase()),
        Some(ext) if MD_EXT.contains(&ext.as_str())
    )
}

/// Should this directory entry be skipped during a vault walk?
fn skip_dir(name: &str) -> bool {
    matches!(
        name,
        ".git" | "node_modules" | ".venv" | "venv" | "target" | ".obsidian" | ".markup"
    )
}

/// Walk `root` recursively and return absolute paths to every markdown file.
/// Skips common build/VCS directories. Caller decides what to do with result.
pub fn scan_markdown_files(root: &Path) -> AppResult<Vec<PathBuf>> {
    let mut out = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            !e.file_type().is_dir()
                || e.file_name()
                    .to_str()
                    .map(|n| !skip_dir(n))
                    .unwrap_or(true)
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue, // skip unreadable entries; don't fail the whole walk
        };
        if entry.file_type().is_file() && is_markdown(entry.path()) {
            out.push(entry.path().to_owned());
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn detects_markdown_extensions() {
        assert!(is_markdown(Path::new("a.md")));
        assert!(is_markdown(Path::new("a.MD")));
        assert!(is_markdown(Path::new("a.markdown")));
        assert!(is_markdown(Path::new("a.mdx")));
        assert!(!is_markdown(Path::new("a.txt")));
        assert!(!is_markdown(Path::new("a")));
    }

    #[test]
    fn skips_node_modules_and_dot_dirs() {
        let tmp = tempdir().unwrap();
        let root = tmp.path();
        fs::write(root.join("a.md"), "").unwrap();
        fs::create_dir_all(root.join("nested")).unwrap();
        fs::write(root.join("nested/b.md"), "").unwrap();
        fs::create_dir_all(root.join("node_modules")).unwrap();
        fs::write(root.join("node_modules/c.md"), "").unwrap();
        fs::create_dir_all(root.join(".git")).unwrap();
        fs::write(root.join(".git/d.md"), "").unwrap();

        let mut found = scan_markdown_files(root).unwrap();
        found.sort();
        let expected = vec![root.join("a.md"), root.join("nested/b.md")];
        let mut expected_sorted = expected.clone();
        expected_sorted.sort();
        assert_eq!(found, expected_sorted);
    }
}
