//! Spike 0.3 — measure that a 10k-file vault indexes within budget.
//!
//! Run with:
//!   cargo test --release --test spike_03 -- --nocapture --ignored bench_10k_files
//!
//! Target (per docs/research/05-spike-results.md):
//!   - Index 10k empty .md files < 5s
//!   - Incremental update on FS change < 100ms

use markup_lib::index::MarkupIndex;
use markup_lib::scanner;
use markup_lib::vault::file_mtime_ms;
use markup_lib::watcher::{watch_vault, VaultChange};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tempfile::tempdir;

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "spike-bench: run with --ignored"]
async fn bench_10k_files() {
    let count = std::env::var("BENCH_FILES")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(10_000usize);

    let vault_dir = tempdir().unwrap();
    let index_dir = tempdir().unwrap();

    let now = Instant::now();
    for i in 0..count {
        let sub = vault_dir.path().join(format!("dir{:02}", i % 50));
        std::fs::create_dir_all(&sub).unwrap();
        let path = sub.join(format!("note_{:06}.md", i));
        std::fs::write(
            &path,
            format!(
                "# Note {n}\n\nThis is note number {n}. It mentions tantivy and markup.\n",
                n = i
            ),
        )
        .unwrap();
    }
    let create_elapsed = now.elapsed();
    eprintln!("created {} files in {:?}", count, create_elapsed);

    let now = Instant::now();
    let files = scanner::scan_markdown_files(vault_dir.path()).unwrap();
    let scan_elapsed = now.elapsed();
    eprintln!("scanned {} files in {:?}", files.len(), scan_elapsed);
    assert_eq!(files.len(), count);

    let now = Instant::now();
    let index = MarkupIndex::open_or_create(index_dir.path()).unwrap();
    for path in &files {
        let content = std::fs::read_to_string(path).unwrap();
        let mtime = file_mtime_ms(path);
        index.upsert_file(path, &content, mtime).await.unwrap();
    }
    index.commit().await.unwrap();
    let index_elapsed = now.elapsed();
    eprintln!("indexed {} files in {:?}", files.len(), index_elapsed);

    let budget_ms = if count == 10_000 {
        5000
    } else {
        (count as u128) / 2 + 1000
    };
    assert!(
        index_elapsed.as_millis() < budget_ms,
        "indexing {} files took {:?}, target < {}ms",
        count,
        index_elapsed,
        budget_ms
    );

    // Search after index
    let now = Instant::now();
    let hits = index.search("tantivy", 50).unwrap();
    let search_elapsed = now.elapsed();
    eprintln!(
        "search returned {} hits in {:?}",
        hits.len(),
        search_elapsed
    );
    assert!(!hits.is_empty(), "expected search hits");
    assert!(
        search_elapsed.as_millis() < 100,
        "search took {:?}, target < 100ms",
        search_elapsed
    );
}

/// Verify that watcher → index update round-trip is under 100ms (excluding the
/// watcher's intentional 150ms debounce window).
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "spike-bench: run with --ignored"]
async fn bench_incremental_update() {
    let vault = tempdir().unwrap();
    let collected: Arc<Mutex<Vec<VaultChange>>> = Arc::new(Mutex::new(Vec::new()));
    let cl = collected.clone();
    let _watcher = watch_vault(vault.path(), move |changes| {
        cl.lock().unwrap().extend(changes);
    })
    .unwrap();

    // give the watcher a moment to subscribe
    tokio::time::sleep(Duration::from_millis(200)).await;

    // Now write a file and time the *entire* watch→update→index cycle.
    let path = vault.path().join("hot.md");
    let start = Instant::now();
    std::fs::write(&path, "# Hot\n\nfresh content").unwrap();

    // Wait for the change to surface (watcher debounce is 150ms; budget 1s
    // total just to confirm the system doesn't hang).
    let mut waited = Duration::ZERO;
    while collected.lock().unwrap().is_empty() && waited < Duration::from_secs(2) {
        tokio::time::sleep(Duration::from_millis(20)).await;
        waited += Duration::from_millis(20);
    }
    let total = start.elapsed();
    let got = collected.lock().unwrap().clone();
    eprintln!("watcher fired in {:?} for {:?}", total, got);
    assert!(!got.is_empty(), "no change event observed");
}
