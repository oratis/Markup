//! Integration tests for the public Rust modules used by IPC commands.
//!
//! We test the *underlying functions* (in markup_lib::*), not the
//! `#[tauri::command]` wrappers — those need a real AppHandle and are best
//! covered by an end-to-end harness later.

use markup_lib::index::{IndexSchema, MarkupIndex};
use markup_lib::scanner::{is_markdown, scan_markdown_files};
use std::fs;
use tempfile::tempdir;

#[test]
fn is_markdown_recognises_known_extensions() {
    assert!(is_markdown(std::path::Path::new("a.md")));
    assert!(is_markdown(std::path::Path::new("a.MD")));
    assert!(is_markdown(std::path::Path::new("a.markdown")));
    assert!(is_markdown(std::path::Path::new("a.mdx")));
    assert!(is_markdown(std::path::Path::new("a.mkd")));
    assert!(!is_markdown(std::path::Path::new("a.txt")));
    assert!(!is_markdown(std::path::Path::new("README")));
}

#[test]
fn scan_finds_files_at_depth_and_skips_dotdirs() {
    let tmp = tempdir().unwrap();
    let root = tmp.path();
    fs::write(root.join("top.md"), "").unwrap();
    fs::create_dir_all(root.join("a/b/c")).unwrap();
    fs::write(root.join("a/b/c/deep.md"), "").unwrap();
    fs::create_dir_all(root.join("node_modules")).unwrap();
    fs::write(root.join("node_modules/skip.md"), "").unwrap();
    fs::create_dir_all(root.join(".git")).unwrap();
    fs::write(root.join(".git/inside.md"), "").unwrap();

    let mut found: Vec<_> = scan_markdown_files(root)
        .unwrap()
        .into_iter()
        .map(|p| p.strip_prefix(root).unwrap().to_path_buf())
        .collect();
    found.sort();
    let mut want: Vec<_> = vec![
        std::path::PathBuf::from("a/b/c/deep.md"),
        std::path::PathBuf::from("top.md"),
    ];
    want.sort();
    assert_eq!(found, want);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn index_search_phrase_returns_only_matching_doc() {
    let tmp = tempdir().unwrap();
    let idx = MarkupIndex::open_or_create(tmp.path()).unwrap();
    idx.upsert_file(
        std::path::Path::new("/x/foo.md"),
        "# Foo\n\nThe quick brown fox jumps over the lazy dog.",
        100,
    )
    .await
    .unwrap();
    idx.upsert_file(
        std::path::Path::new("/x/bar.md"),
        "# Bar\n\nA peaceful afternoon with no animals.",
        200,
    )
    .await
    .unwrap();
    idx.commit().await.unwrap();

    let hits = idx.search("fox", 10).unwrap();
    assert_eq!(hits.len(), 1);
    assert_eq!(hits[0].path, "/x/foo.md");
    assert_eq!(hits[0].title, "Foo");
    assert_eq!(hits[0].mtime_ms, 100);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn index_remove_drops_doc_from_results() {
    let tmp = tempdir().unwrap();
    let idx = MarkupIndex::open_or_create(tmp.path()).unwrap();
    idx.upsert_file(std::path::Path::new("/a.md"), "uniqueterm-zhgrf", 1)
        .await
        .unwrap();
    idx.commit().await.unwrap();
    assert_eq!(idx.search("uniqueterm-zhgrf", 5).unwrap().len(), 1);

    idx.remove_file(std::path::Path::new("/a.md")).await.unwrap();
    idx.commit().await.unwrap();
    assert_eq!(idx.search("uniqueterm-zhgrf", 5).unwrap().len(), 0);
}

#[test]
fn schema_fields_are_distinct() {
    let s = IndexSchema::build();
    assert_ne!(s.path, s.title);
    assert_ne!(s.title, s.body);
    assert_ne!(s.body, s.mtime_ms);
}
