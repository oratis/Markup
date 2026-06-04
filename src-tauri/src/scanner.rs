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

/// Obsidian-compatible whiteboard files.
#[inline]
pub fn is_canvas(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase()),
        Some(ext) if ext == "canvas"
    )
}

/// Standalone HTML documents (`.html` / `.htm`). Markup opens and renders these.
#[inline]
pub fn is_html(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase()),
        Some(ext) if ext == "html" || ext == "htm"
    )
}

/// Files the vault sidebar / QuickOpen should surface. Wider than
/// `is_markdown` (which gates the Tantivy text index) — canvases and HTML are
/// listable as files; canvas JSON isn't body-indexed.
#[inline]
pub fn is_listable(path: &Path) -> bool {
    is_markdown(path) || is_canvas(path) || is_html(path)
}

/// Files whose text is full-text indexed: markdown + HTML (HTML is stripped to
/// visible text first). Canvas JSON is excluded so it doesn't pollute search.
#[inline]
pub fn is_indexable(path: &Path) -> bool {
    is_markdown(path) || is_html(path)
}

/// Strip HTML to visible text for full-text indexing: drop `<script>` / `<style>`
/// blocks and all tags, decode a few common entities, collapse whitespace.
pub fn strip_html(html: &str) -> String {
    let lower = html.to_ascii_lowercase();
    let mut out = String::with_capacity(html.len());
    let mut chars = html.char_indices();
    while let Some((i, c)) = chars.next() {
        if c == '<' {
            let block = if lower[i..].starts_with("<script") {
                Some("</script>")
            } else if lower[i..].starts_with("<style") {
                Some("</style>")
            } else {
                None
            };
            if let Some(close) = block {
                if let Some(rel) = lower[i..].find(close) {
                    let end = i + rel + close.len();
                    out.push(' ');
                    for (j, _) in chars.by_ref() {
                        if j + 1 >= end {
                            break;
                        }
                    }
                    continue;
                }
                break;
            }
            out.push(' ');
            for (_, cc) in chars.by_ref() {
                if cc == '>' {
                    break;
                }
            }
            continue;
        }
        out.push(c);
    }
    let decoded = out
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ");
    decoded.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Extract the document title from an HTML `<title>…</title>`, decoding a few
/// common entities and collapsing whitespace. Returns `None` when there is no
/// non-empty title (the caller then falls back to the filename).
pub fn html_title(html: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();
    let open = lower.find("<title")?;
    // Skip to the end of the opening tag (handles attributes like `<title foo>`).
    let after_open = open + lower[open..].find('>')? + 1;
    let rel_close = lower[after_open..].find("</title>")?;
    let raw = &html[after_open..after_open + rel_close];
    let decoded = raw
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ");
    let collapsed = decoded.split_whitespace().collect::<Vec<_>>().join(" ");
    if collapsed.is_empty() {
        None
    } else {
        Some(collapsed)
    }
}

/// Should this directory entry be skipped during a vault walk?
fn skip_dir(name: &str) -> bool {
    matches!(
        name,
        ".git" | "node_modules" | ".venv" | "venv" | "target" | ".obsidian" | ".markup"
    )
}

/// True when `path` lives inside a directory the vault walk skips (.git,
/// node_modules, .obsidian, …), relative to `root`. The runtime watcher uses
/// this so a file created under a skipped dir while the app is running isn't
/// indexed — the initial scan already excludes those dirs, so without it the
/// two paths disagree and vendored/template markdown pollutes search.
pub fn is_within_skipped_dir(root: &Path, path: &Path) -> bool {
    let Ok(rel) = path.strip_prefix(root) else {
        return false; // not under the vault root — leave the decision to the caller
    };
    rel.components().any(|c| match c {
        std::path::Component::Normal(name) => name.to_str().map(skip_dir).unwrap_or(false),
        _ => false,
    })
}

/// Walk `root` recursively and return absolute paths to every markdown file.
/// Skips common build/VCS directories. Caller decides what to do with result.
pub fn scan_markdown_files(root: &Path) -> AppResult<Vec<PathBuf>> {
    scan_filtered(root, is_markdown)
}

/// Walk `root` and return every file the vault sidebar should show
/// (markdown + canvas). Tantivy indexing still uses `scan_markdown_files`
/// so canvas JSON doesn't pollute body search.
pub fn scan_vault_files(root: &Path) -> AppResult<Vec<PathBuf>> {
    scan_filtered(root, is_listable)
}

/// Walk `root` and return every file whose text should be full-text indexed
/// (markdown + HTML).
pub fn scan_indexable_files(root: &Path) -> AppResult<Vec<PathBuf>> {
    scan_filtered(root, is_indexable)
}

fn scan_filtered(root: &Path, accept: fn(&Path) -> bool) -> AppResult<Vec<PathBuf>> {
    let mut out = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            !e.file_type().is_dir() || e.file_name().to_str().map(|n| !skip_dir(n)).unwrap_or(true)
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue, // skip unreadable entries; don't fail the whole walk
        };
        if entry.file_type().is_file() && accept(entry.path()) {
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
    fn detects_canvas_files_separately_from_markdown() {
        assert!(is_canvas(Path::new("a.canvas")));
        assert!(is_canvas(Path::new("A.Canvas")));
        assert!(!is_canvas(Path::new("a.md")));
        // is_listable accepts both kinds.
        assert!(is_listable(Path::new("a.md")));
        assert!(is_listable(Path::new("a.canvas")));
        assert!(!is_listable(Path::new("a.txt")));
    }

    #[test]
    fn detects_html_files() {
        assert!(is_html(Path::new("page.html")));
        assert!(is_html(Path::new("PAGE.HTM")));
        assert!(!is_html(Path::new("a.md")));
        // listable + indexable accept HTML; canvas is listable but not indexable.
        assert!(is_listable(Path::new("a.html")));
        assert!(is_indexable(Path::new("a.html")));
        assert!(is_indexable(Path::new("a.md")));
        assert!(!is_indexable(Path::new("a.canvas")));
    }

    #[test]
    fn strip_html_keeps_visible_text_only() {
        let html = "<html><head><style>.x{color:red}</style><title>T</title></head>\
                    <body><h1>Hello</h1><p>world &amp; more</p>\
                    <script>alert(1)</script></body></html>";
        let text = strip_html(html);
        assert!(text.contains("Hello"));
        assert!(text.contains("world & more"));
        assert!(!text.contains("alert"));
        assert!(!text.contains("color:red"));
        assert!(!text.contains('<'));
    }

    #[test]
    fn html_title_extracts_and_decodes() {
        let html = "<html><head><title> Tom &amp;  Jerry </title></head><body>x</body></html>";
        assert_eq!(html_title(html).as_deref(), Some("Tom & Jerry"));
    }

    #[test]
    fn html_title_handles_attributes_and_case() {
        let html = "<HTML><HEAD><TITLE dir=\"ltr\">My Page</TITLE></HEAD></HTML>";
        assert_eq!(html_title(html).as_deref(), Some("My Page"));
    }

    #[test]
    fn html_title_none_when_missing_or_empty() {
        assert_eq!(html_title("<html><body>no title</body></html>"), None);
        assert_eq!(html_title("<title>   </title>"), None);
    }

    #[test]
    fn scan_indexable_includes_html_excludes_canvas() {
        let tmp = tempdir().unwrap();
        let root = tmp.path();
        fs::write(root.join("note.md"), "").unwrap();
        fs::write(root.join("page.html"), "<p>hi</p>").unwrap();
        fs::write(root.join("board.canvas"), "{}").unwrap();
        let mut found = scan_indexable_files(root).unwrap();
        found.sort();
        let mut expected = vec![root.join("note.md"), root.join("page.html")];
        expected.sort();
        assert_eq!(found, expected);
    }

    #[test]
    fn scan_vault_files_surfaces_canvas_alongside_markdown() {
        let tmp = tempdir().unwrap();
        let root = tmp.path();
        fs::write(root.join("note.md"), "").unwrap();
        fs::write(root.join("board.canvas"), "{}").unwrap();
        fs::write(root.join("ignored.txt"), "").unwrap();
        let mut found = scan_vault_files(root).unwrap();
        found.sort();
        let mut expected = vec![root.join("board.canvas"), root.join("note.md")];
        expected.sort();
        assert_eq!(found, expected);
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

    #[test]
    fn is_within_skipped_dir_matches_runtime_paths() {
        let root = Path::new("/v");
        assert!(is_within_skipped_dir(
            root,
            Path::new("/v/node_modules/a.md")
        ));
        assert!(is_within_skipped_dir(
            root,
            Path::new("/v/sub/.obsidian/b.md")
        ));
        assert!(!is_within_skipped_dir(root, Path::new("/v/notes/c.md")));
        assert!(!is_within_skipped_dir(root, Path::new("/v/a.md")));
        // Only the portion BELOW root is checked — a vault whose own path
        // contains a skipped name is fine.
        let nested = Path::new("/home/target/vault");
        assert!(!is_within_skipped_dir(
            nested,
            Path::new("/home/target/vault/d.md")
        ));
    }
}
