use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),

    #[error("the path is not a markdown file: {0}")]
    NotMarkdown(String),

    #[error("file changed on disk since it was opened (stale mtime)")]
    StaleMtime,

    #[error("dialog cancelled")]
    Cancelled,

    #[error("walk: {0}")]
    Walk(#[from] walkdir::Error),

    #[error("notify: {0}")]
    Notify(#[from] notify::Error),

    #[error("tantivy: {0}")]
    Tantivy(#[from] tantivy::TantivyError),

    #[error("query: {0}")]
    Query(#[from] tantivy::query::QueryParserError),

    #[error("vault not open")]
    NoVault,

    #[error("{0}")]
    Other(String),
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
