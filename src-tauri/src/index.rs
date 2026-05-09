//! Tantivy-backed full-text index for the open vault.
//!
//! Schema:
//!   path     STRING + STORED — primary key, exact-match deletion
//!   title    TEXT (default tokenizer) + STORED — derived from first H1 or filename
//!   body     TEXT — full content, not stored
//!   mtime_ms i64 FAST + STORED — for ordering recent edits

use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::*;
use tantivy::{doc, Index, IndexWriter, ReloadPolicy, TantivyDocument, Term};

#[derive(Clone)]
pub struct IndexSchema {
    pub schema: Schema,
    pub path: Field,
    pub title: Field,
    pub body: Field,
    pub mtime_ms: Field,
}

impl IndexSchema {
    pub fn build() -> Self {
        let mut sb = Schema::builder();
        let path = sb.add_text_field("path", STRING | STORED);
        let title = sb.add_text_field("title", TEXT | STORED);
        let body = sb.add_text_field("body", TEXT);
        let mtime_ms = sb.add_i64_field("mtime_ms", FAST | STORED);
        Self {
            schema: sb.build(),
            path,
            title,
            body,
            mtime_ms,
        }
    }
}

pub struct MarkupIndex {
    pub index: Index,
    pub schema: IndexSchema,
    /// Held in a tokio mutex; commits are serialized through it.
    writer: tokio::sync::Mutex<IndexWriter>,
}

#[derive(Debug, Serialize)]
pub struct SearchHit {
    pub path: String,
    pub title: String,
    pub mtime_ms: i64,
    pub score: f32,
}

impl MarkupIndex {
    /// Open or create an index at `dir`. Designed for vault-scoped indexes.
    pub fn open_or_create(dir: &Path) -> AppResult<Self> {
        let schema = IndexSchema::build();
        let dir = dir.to_path_buf();
        if !dir.exists() {
            std::fs::create_dir_all(&dir)?;
        }
        let mmap = tantivy::directory::MmapDirectory::open(&dir)
            .map_err(|e| AppError::Other(format!("mmap dir: {e}")))?;
        let index = Index::open_or_create(mmap, schema.schema.clone())?;
        // 64MB writer heap — fast for the 10k file scale.
        let writer = index.writer(64_000_000)?;
        Ok(Self {
            index,
            schema,
            writer: tokio::sync::Mutex::new(writer),
        })
    }

    /// Index or update a single file. Removes any prior doc with the same path.
    pub async fn upsert_file(
        &self,
        path: &Path,
        content: &str,
        mtime_ms: i64,
    ) -> AppResult<()> {
        let path_str = path.to_string_lossy().into_owned();
        let title = derive_title(path, content);

        let mut writer = self.writer.lock().await;
        writer.delete_term(Term::from_field_text(self.schema.path, &path_str));
        writer.add_document(doc!(
            self.schema.path => path_str,
            self.schema.title => title,
            self.schema.body => content.to_string(),
            self.schema.mtime_ms => mtime_ms,
        ))?;
        Ok(())
    }

    pub async fn remove_file(&self, path: &Path) -> AppResult<()> {
        let path_str = path.to_string_lossy().into_owned();
        let mut writer = self.writer.lock().await;
        writer.delete_term(Term::from_field_text(self.schema.path, &path_str));
        Ok(())
    }

    /// Commit pending changes so they become searchable.
    pub async fn commit(&self) -> AppResult<()> {
        let mut writer = self.writer.lock().await;
        writer.commit()?;
        Ok(())
    }

    /// Search the index. Returns top `limit` hits ordered by score.
    pub fn search(&self, query: &str, limit: usize) -> AppResult<Vec<SearchHit>> {
        let reader = self
            .index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()?;
        let searcher = reader.searcher();
        let parser = QueryParser::for_index(
            &self.index,
            vec![self.schema.title, self.schema.body],
        );
        let q = parser.parse_query(query)?;
        let top = searcher.search(&q, &TopDocs::with_limit(limit))?;

        let mut out = Vec::with_capacity(top.len());
        for (score, addr) in top {
            let retrieved: TantivyDocument = searcher.doc(addr)?;
            let path = retrieved
                .get_first(self.schema.path)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let title = retrieved
                .get_first(self.schema.title)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let mtime_ms = retrieved
                .get_first(self.schema.mtime_ms)
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            out.push(SearchHit {
                path,
                title,
                mtime_ms,
                score,
            });
        }
        Ok(out)
    }
}

/// Take the first H1 (`# Title`) line; otherwise use the filename without extension.
fn derive_title(path: &Path, content: &str) -> String {
    for line in content.lines().take(50) {
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix("# ") {
            let title = rest.trim();
            if !title.is_empty() {
                return title.to_string();
            }
        }
    }
    path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string()
}

/// Convenience: where the index for a given vault lives.
pub fn index_dir_for_vault(app_data_dir: &Path, vault_root: &Path) -> PathBuf {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    vault_root.hash(&mut h);
    app_data_dir.join("index").join(format!("{:x}", h.finish()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn upsert_and_search_roundtrip() {
        let tmp = tempdir().unwrap();
        let idx = MarkupIndex::open_or_create(tmp.path()).unwrap();

        idx.upsert_file(
            Path::new("/notes/foo.md"),
            "# Hello\n\nThis is about *markdown editors* and KaTeX.",
            1234567890,
        )
        .await
        .unwrap();
        idx.upsert_file(
            Path::new("/notes/bar.md"),
            "# Goodbye\n\nNo relevant words here.",
            1234567891,
        )
        .await
        .unwrap();
        idx.commit().await.unwrap();

        let hits = idx.search("markdown", 10).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].path, "/notes/foo.md");
        assert_eq!(hits[0].title, "Hello");
    }

    #[tokio::test]
    async fn upsert_replaces_existing() {
        let tmp = tempdir().unwrap();
        let idx = MarkupIndex::open_or_create(tmp.path()).unwrap();
        idx.upsert_file(Path::new("/a.md"), "first", 1).await.unwrap();
        idx.upsert_file(Path::new("/a.md"), "second different content", 2)
            .await
            .unwrap();
        idx.commit().await.unwrap();
        let hits = idx.search("first", 10).unwrap();
        assert!(hits.is_empty(), "old version should be gone");
        let hits = idx.search("different", 10).unwrap();
        assert_eq!(hits.len(), 1);
    }
}
