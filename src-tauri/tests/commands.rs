//! Integration tests for the public Rust modules used by IPC commands.
//!
//! We test the *underlying functions* (in markup_lib::*), not the
//! `#[tauri::command]` wrappers — those need a real AppHandle and are best
//! covered by an end-to-end harness later.

use markup_lib::index::{IndexSchema, MarkupIndex};
use markup_lib::scanner::{is_markdown, scan_markdown_files};
use std::fs;
use tempfile::tempdir;

// Re-import the helpers we'll exercise. The #[tauri::command] macro keeps
// the original async fn callable; we just need a tokio runtime.
use markup_lib::vault::{file_mtime_ms, file_mtime_ms_from_meta};

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

#[test]
fn mtime_helpers_return_recent_timestamp() {
    let tmp = tempdir().unwrap();
    let p = tmp.path().join("a.md");
    fs::write(&p, "x").unwrap();
    let meta = fs::metadata(&p).unwrap();
    let ms = file_mtime_ms_from_meta(&meta);
    assert!(ms > 0);
    let ms2 = file_mtime_ms(&p);
    // Within 5s of each other
    assert!((ms2 - ms).abs() < 5000);
}

#[test]
fn mtime_for_missing_file_is_zero() {
    let tmp = tempdir().unwrap();
    let p = tmp.path().join("does-not-exist.md");
    assert_eq!(file_mtime_ms(&p), 0);
}

#[test]
fn search_returns_results_in_score_order() {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    runtime.block_on(async {
        let tmp = tempdir().unwrap();
        let idx = MarkupIndex::open_or_create(tmp.path()).unwrap();
        // Two docs, one mentions the term once, the other repeatedly.
        idx.upsert_file(
            std::path::Path::new("/a.md"),
            "tantivy",
            1,
        )
        .await
        .unwrap();
        idx.upsert_file(
            std::path::Path::new("/b.md"),
            "tantivy tantivy tantivy and more tantivy",
            2,
        )
        .await
        .unwrap();
        idx.commit().await.unwrap();
        let hits = idx.search("tantivy", 5).unwrap();
        assert_eq!(hits.len(), 2);
        // /b.md has more matches → higher BM25 score
        assert_eq!(hits[0].path, "/b.md");
        assert!(hits[0].score >= hits[1].score);
    });
}

#[test]
fn search_empty_index_returns_no_hits() {
    let tmp = tempdir().unwrap();
    let idx = MarkupIndex::open_or_create(tmp.path()).unwrap();
    let hits = idx.search("anything", 10).unwrap();
    assert!(hits.is_empty());
}
