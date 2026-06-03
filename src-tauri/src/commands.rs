use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
pub struct LoadedFile {
    pub path: String,
    pub content: String,
    pub mtime_ms: u128,
}

fn mtime_ms(meta: &std::fs::Metadata) -> u128 {
    meta.modified()
        .unwrap_or(SystemTime::UNIX_EPOCH)
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn looks_like_markdown(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase()),
        Some(ext) if matches!(ext.as_str(), "md" | "markdown" | "mdx" | "mkd")
    )
}

fn looks_like_canvas(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase()),
        Some(ext) if ext == "canvas"
    )
}

fn looks_like_html(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase()),
        Some(ext) if matches!(ext.as_str(), "html" | "htm")
    )
}

/// Return true for any file extension the editor knows how to load.
/// Currently: Markdown variants (md / markdown / mdx / mkd), Obsidian Canvas
/// files (.canvas), and HTML documents (.html / .htm). Other extensions are
/// rejected at the read boundary so a stray ".pdf" can't slip into a tab buffer
/// where the editor would mis-render it.
fn looks_like_editable(path: &Path) -> bool {
    looks_like_markdown(path) || looks_like_canvas(path) || looks_like_html(path)
}

#[tauri::command]
pub async fn open_file(app: tauri::AppHandle) -> AppResult<Option<LoadedFile>> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown", "mdx", "mkd"])
        .add_filter("HTML", &["html", "htm"])
        .add_filter("Canvas", &["canvas"])
        .pick_file(move |maybe_path| {
            let _ = tx.send(maybe_path);
        });

    let picked = rx.await.map_err(|e| AppError::Other(e.to_string()))?;
    let Some(file_path) = picked else { return Ok(None) };

    let path_buf: PathBuf = file_path
        .into_path()
        .map_err(|e| AppError::Other(format!("dialog returned non-path target: {e}")))?;

    let loaded = read_file_inner(&path_buf).await?;
    Ok(Some(loaded))
}

#[tauri::command]
pub async fn read_file(path: String) -> AppResult<LoadedFile> {
    let p = PathBuf::from(&path);
    read_file_inner(&p).await
}

async fn read_file_inner(path: &Path) -> AppResult<LoadedFile> {
    if !looks_like_editable(path) {
        return Err(AppError::NotMarkdown(path.display().to_string()));
    }
    let content = tokio::fs::read_to_string(path).await?;
    let meta = tokio::fs::metadata(path).await?;
    Ok(LoadedFile {
        path: path.to_string_lossy().into_owned(),
        content,
        mtime_ms: mtime_ms(&meta),
    })
}

#[tauri::command]
pub async fn rename_file(from: String, to: String) -> AppResult<()> {
    let from_path = PathBuf::from(&from);
    let to_path = PathBuf::from(&to);
    if to_path.exists() {
        return Err(AppError::Other(format!(
            "destination already exists: {to}"
        )));
    }
    if let Some(parent) = to_path.parent() {
        if !parent.exists() {
            tokio::fs::create_dir_all(parent).await?;
        }
    }
    tokio::fs::rename(&from_path, &to_path).await?;
    Ok(())
}

/// Move a file to the user's Trash. macOS-only — uses NSFileManager via
/// `osascript` to keep dependencies trivial. Note: this requires the user
/// to grant Automation access to System Events on first use.
#[tauri::command]
pub async fn trash_file(path: String) -> AppResult<()> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(AppError::Other(format!("not found: {path}")));
    }
    // Use AppleScript to move to Trash. POSIX path handles arbitrary chars.
    let script = format!(
        "tell application \"Finder\" to delete POSIX file \"{}\"",
        path.replace('\\', "\\\\").replace('"', "\\\"")
    );
    let status = tokio::process::Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .status()
        .await?;
    if !status.success() {
        return Err(AppError::Other(format!(
            "osascript trash failed (status: {status})"
        )));
    }
    Ok(())
}

/// Write an image (typically clipboard paste) to the vault and return the
/// relative path used to reference it from markdown.
///
/// `dir_relative` is appended to the vault root (eg. "assets" or
/// "images/{date}"). `bytes` is the raw image data; `ext` is the image
/// extension without the dot (eg. "png").
#[tauri::command]
pub async fn write_image(
    vault_root: String,
    dir_relative: String,
    bytes: Vec<u8>,
    ext: String,
) -> AppResult<String> {
    let root = PathBuf::from(&vault_root);
    if !root.is_dir() {
        return Err(AppError::Other(format!("vault root not a dir: {vault_root}")));
    }
    let safe_ext = ext.trim_start_matches('.');
    let safe_ext = if safe_ext.is_empty() { "png" } else { safe_ext };
    // Guard against path traversal: `dir_relative` is appended to the vault
    // root, so a value like "../../etc" must not escape it. Reject any
    // parent-dir / absolute component before joining.
    let rel = PathBuf::from(dir_relative.trim_start_matches('/'));
    if rel.components().any(|c| {
        matches!(
            c,
            std::path::Component::ParentDir
                | std::path::Component::RootDir
                | std::path::Component::Prefix(_)
        )
    }) {
        return Err(AppError::Other(format!(
            "unsafe image directory (path traversal): {dir_relative}"
        )));
    }
    let dir = root.join(&rel);
    tokio::fs::create_dir_all(&dir).await?;
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let file_name = format!("paste-{now_ms}.{safe_ext}");
    let abs = dir.join(&file_name);
    tokio::fs::write(&abs, bytes).await?;
    let rel = abs
        .strip_prefix(&root)
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|_| abs.clone());
    Ok(rel.to_string_lossy().into_owned())
}

/// syntect theme used for code-fence highlighting. "InspiredGitHub" is a
/// light, near-white theme that sits well on top of all three light export
/// themes. syntect emits inline styles, so the export stays self-contained.
const SYNTECT_THEME: &str = "InspiredGitHub";

/// CDN versions for the math / diagram renderers. Pinned so an export made
/// today keeps rendering the same way. Only injected when the document
/// actually contains math / mermaid (see `build_head_assets`).
const KATEX_VERSION: &str = "0.16.11";
const MERMAID_VERSION: &str = "11";

/// A code-fence highlighter that delegates to syntect for real languages but
/// routes ```mermaid fences to a `<pre class="mermaid">` block so the injected
/// mermaid.js can render them client-side (syntect has no mermaid grammar and
/// would otherwise dump the diagram source as plain text).
struct MarkupHighlighter {
    inner: comrak::plugins::syntect::SyntectAdapter,
}

impl comrak::adapters::SyntaxHighlighterAdapter for MarkupHighlighter {
    fn write_highlighted(
        &self,
        output: &mut dyn Write,
        lang: Option<&str>,
        code: &str,
    ) -> std::io::Result<()> {
        if lang == Some("mermaid") {
            // Emit the diagram source verbatim (escaped). mermaid.js reads the
            // element's textContent and swaps in the rendered SVG.
            return output.write_all(html_escape(code).as_bytes());
        }
        // syntect's default syntax set has no TypeScript grammar; highlight the
        // TS family (and JSX) as JavaScript so the common case still gets
        // keywords/strings/comments coloured.
        let lang = match lang {
            Some("ts" | "tsx" | "mts" | "cts" | "jsx") => Some("js"),
            other => other,
        };
        self.inner.write_highlighted(output, lang, code)
    }

    fn write_pre_tag(
        &self,
        output: &mut dyn Write,
        attributes: std::collections::HashMap<String, String>,
    ) -> std::io::Result<()> {
        // With `github_pre_lang` the fence language arrives as the `lang`
        // attribute on the <pre> — the only place we can see it before the
        // <code>/highlight calls.
        if attributes.get("lang").map(String::as_str) == Some("mermaid") {
            return output.write_all(b"<pre class=\"mermaid\">");
        }
        self.inner.write_pre_tag(output, attributes)
    }

    fn write_code_tag(
        &self,
        output: &mut dyn Write,
        attributes: std::collections::HashMap<String, String>,
    ) -> std::io::Result<()> {
        // Under `github_pre_lang` the language lives on the <pre>, so the
        // <code> attributes are empty for every fence — delegating yields a
        // clean `<code>` for both mermaid and highlighted blocks.
        self.inner.write_code_tag(output, attributes)
    }
}

/// Build the `<head>` `<script>`/`<link>` tags for math and/or diagrams.
/// Returns an empty string when neither is present, keeping ordinary exports
/// fully self-contained and offline-renderable.
fn build_head_assets(needs_math: bool, needs_mermaid: bool) -> String {
    let mut out = String::new();
    if needs_math {
        out.push_str(&format!(
            r#"<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@{v}/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@{v}/dist/katex.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function () {{
  document.querySelectorAll("[data-math-style]").forEach(function (el) {{
    var display = el.getAttribute("data-math-style") === "display";
    try {{ katex.render(el.textContent, el, {{ displayMode: display, throwOnError: false }}); }} catch (e) {{}}
  }});
}});
</script>
"#,
            v = KATEX_VERSION
        ));
    }
    if needs_mermaid {
        out.push_str(&format!(
            r#"<script type="module">
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@{v}/dist/mermaid.esm.min.mjs";
mermaid.initialize({{ startOnLoad: false }});
window.addEventListener("DOMContentLoaded", async function () {{
  var blocks = document.querySelectorAll("pre.mermaid");
  for (var i = 0; i < blocks.length; i++) {{
    try {{ var r = await mermaid.render("mmd-" + i, blocks[i].textContent); blocks[i].innerHTML = r.svg; }} catch (e) {{}}
  }}
}});
</script>
"#,
            v = MERMAID_VERSION
        ));
    }
    out
}

/// Render markdown to standalone HTML using one of the named themes.
/// `theme` accepts "github" (default), "plain", or "tufte".
///
/// Code fences are syntax-highlighted with inline styles (self-contained).
/// `$math$` / `$$math$$` and ```mermaid blocks render via KaTeX / mermaid,
/// whose assets are injected only when the document uses them.
#[tauri::command]
pub async fn render_html(
    content: String,
    title: Option<String>,
    theme: Option<String>,
) -> AppResult<String> {
    Ok(render_markdown_document(
        &content,
        title.as_deref(),
        theme.as_deref(),
    ))
}

/// The actual render pipeline, split out from the `#[tauri::command]` wrapper
/// so unit tests can exercise the real code path (the macro wraps the public
/// fn behind an Invoke handler that's awkward to fake).
pub(crate) fn render_markdown_document(
    content: &str,
    title: Option<&str>,
    theme: Option<&str>,
) -> String {
    let mut opts = comrak::Options::default();
    opts.extension.table = true;
    opts.extension.strikethrough = true;
    opts.extension.tasklist = true;
    opts.extension.autolink = true;
    opts.extension.footnotes = true;
    // Emit GitHub-style `contains-task-list` / `task-list-item` classes so we
    // can style checkboxes without relying on the newer `:has()` selector.
    opts.render.tasklist_classes = true;
    // Stable heading ids so exports support in-page anchors / TOCs.
    opts.extension.header_ids = Some(String::new());
    // Parse `$inline$` / `$$display$$` math at the AST level — the same rule
    // the editor uses — so prose like "$5 and $10" is never mistaken for math.
    opts.extension.math_dollars = true;
    opts.render.unsafe_ = true; // allow inline HTML
    // Put the fence language on the <pre> so MarkupHighlighter can see it.
    opts.render.github_pre_lang = true;

    let highlighter = MarkupHighlighter {
        inner: comrak::plugins::syntect::SyntectAdapter::new(Some(SYNTECT_THEME)),
    };
    let mut plugins = comrak::Plugins::default();
    plugins.render.codefence_syntax_highlighter = Some(&highlighter);

    let body = comrak::markdown_to_html_with_plugins(content, &opts, &plugins);

    let needs_math = body.contains("data-math-style");
    let needs_mermaid = body.contains(r#"class="mermaid""#);
    let head_assets = build_head_assets(needs_math, needs_mermaid);

    let title = title.unwrap_or("Markup export");
    let css = theme_css(theme.unwrap_or("github"));

    format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
{css}
{print}
{common}
</style>
{assets}</head>
<body>
{body}
</body>
</html>
"#,
        title = html_escape(title),
        css = css,
        print = PRINT_RULES,
        common = COMMON_CSS,
        assets = head_assets,
        body = body,
    )
}

/// Write pre-rendered preview HTML to a temp file and return its path.
///
/// Done in Rust deliberately: the JS `fs` plugin enforces a path scope
/// all-list and rejects writes to the temp dir ("forbidden path"), and
/// under the App Sandbox the temp dir is the container's own
/// `…/Data/tmp` — writing there from native code is always permitted
/// and isn't subject to the JS scope. Returns the absolute file path so
/// the caller can hand it to the opener.
#[tauri::command]
pub async fn write_preview_html(html: String, base_name: String) -> AppResult<String> {
    let dir = std::env::temp_dir().join("markup-preview");
    std::fs::create_dir_all(&dir)
        .map_err(|e| AppError::Other(format!("create preview dir: {e}")))?;

    // Sanitize: strip the .md family extension, keep [A-Za-z0-9._-],
    // collapse the rest to '-', cap length, fall back to "untitled".
    let stem = base_name
        .rsplit_once('.')
        .map(|(s, _)| s)
        .unwrap_or(&base_name);
    let mut safe: String = stem
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' { c } else { '-' })
        .collect();
    safe.truncate(80);
    if safe.is_empty() {
        safe.push_str("untitled");
    }

    let path = dir.join(format!("{safe}.html"));
    std::fs::write(&path, html.as_bytes())
        .map_err(|e| AppError::Other(format!("write preview: {e}")))?;
    Ok(path.to_string_lossy().into_owned())
}

fn theme_css(name: &str) -> &'static str {
    match name {
        "plain" => PLAIN_CSS,
        "tufte" => TUFTE_CSS,
        _ => GITHUB_CSS,
    }
}

/// Print-only directives applied on top of every theme: A4 page, sensible
/// margins, repeating page numbers in the footer, and avoid-break hints
/// for images / pre / table / heading-followed-by-paragraph.
const PRINT_RULES: &str = r#"
@media print {
  @page { size: A4; margin: 1.6cm 1.4cm; }
  body { margin: 0; max-width: none; }
  pre, blockquote, table, img { break-inside: avoid; page-break-inside: avoid; }
  h1, h2, h3, h4, h5, h6 { break-after: avoid; page-break-after: avoid; }
  hr { break-after: page; page-break-after: always; border: none; }
}
"#;

const GITHUB_CSS: &str = r#"
body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", sans-serif;
  max-width: 720px;
  margin: 2.5rem auto;
  line-height: 1.7;
  color: #1f2328;
  padding: 0 1.25rem;
}
h1, h2, h3, h4, h5, h6 { line-height: 1.25; }
h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow: auto; }
code { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.9em; }
blockquote { border-left: 3px solid #d0d7de; padding-left: 1rem; color: #57606a; margin: 1em 0; }
table { border-collapse: collapse; }
th, td { border: 1px solid #d0d7de; padding: 6px 12px; }
hr { border: none; border-top: 1px solid #d0d7de; margin: 2rem 0; }
img { max-width: 100%; }
a { color: #0969da; }
"#;

const PLAIN_CSS: &str = r#"
body {
  font-family: Georgia, "Times New Roman", serif;
  max-width: 640px;
  margin: 3rem auto;
  line-height: 1.65;
  color: #111;
  padding: 0 1.25rem;
}
pre { background: #f5f5f5; padding: .75rem; overflow: auto; }
code { font-family: monospace; font-size: 0.9em; }
blockquote { border-left: 2px solid #888; padding-left: 1rem; color: #555; }
table { border-collapse: collapse; }
th, td { border: 1px solid #ccc; padding: 6px 10px; }
img { max-width: 100%; }
a { color: inherit; text-decoration: underline; }
"#;

const TUFTE_CSS: &str = r#"
body {
  font-family: et-book, Palatino, "Palatino Linotype", Georgia, serif;
  max-width: 64em;
  margin: 4rem auto;
  padding: 0 5rem;
  line-height: 1.5;
  color: #111;
  background: #fffff8;
}
h1 { font-weight: 400; font-size: 2.4em; }
h2 { font-style: italic; font-weight: 400; font-size: 1.5em; }
h3, h4, h5, h6 { font-style: italic; font-weight: 400; }
p, ol, ul, blockquote { width: 55%; }
blockquote { font-style: italic; }
pre { width: 52.5%; padding-left: 2.5%; }
code { font-family: "Consolas", monospace; font-size: 0.95em; }
img { max-width: 55%; }
hr { border: 0; border-top: 1px solid #ccc; margin: 1.5em 0; }
a { color: inherit; }
"#;

/// Theme-independent rules applied after the chosen theme. Covers
/// syntect-highlighted code, inline code, tables, task lists, footnotes, and
/// resets so mermaid / math blocks don't render inside a code box.
const COMMON_CSS: &str = r#"
pre { overflow: auto; border-radius: 6px; }
/* syntect sets the <pre> background + inline span colours; keep the inner
   <code> from re-applying our inline-code chrome. */
pre code { background: none; padding: 0; font-size: 0.88em; line-height: 1.5; }
:not(pre) > code {
  background: rgba(127, 127, 127, 0.14);
  padding: 0.12em 0.34em;
  border-radius: 4px;
  font-size: 0.9em;
}
/* Lists. comrak renders a "loose" list (blank lines between items) as
   <li><p>…</p></li>; the <p>'s default 1em margins otherwise detach the
   bullet from its text and balloon the spacing. Collapse them so loose and
   tight lists look identical, and keep nesting compact. */
ul, ol { padding-left: 1.6em; margin: 0.6em 0; }
li { margin: 0.2em 0; }
li > p { margin: 0.2em 0; }
li > p:first-child { margin-top: 0; }
li > p:last-child { margin-bottom: 0; }
li > ul, li > ol { margin: 0.2em 0; }
/* Task lists (GitHub-style classes via tasklist_classes). Drop the bullet,
   and keep the checkbox inline with its text — in a loose list the item text
   is wrapped in a block <p>, which would otherwise drop below the checkbox. */
.contains-task-list { list-style: none; padding-left: 0.2em; }
.task-list-item > input[type="checkbox"] { margin: 0 0.45em 0 0; vertical-align: middle; }
.task-list-item > input[type="checkbox"] + p { display: inline; }
table { display: block; overflow-x: auto; max-width: 100%; }
thead th { background: rgba(127, 127, 127, 0.08); }
tbody tr:nth-child(even) { background: rgba(127, 127, 127, 0.04); }
/* Mermaid + math must not look like code blocks. */
pre.mermaid { background: none; border: none; padding: 0; text-align: center; }
pre.mermaid svg { max-width: 100%; height: auto; }
pre[data-math-style] { background: none; padding: 0; overflow: visible; }
.katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.2em 0; }
.footnotes {
  font-size: 0.9em;
  border-top: 1px solid rgba(127, 127, 127, 0.25);
  margin-top: 2.5rem;
  padding-top: 0.5rem;
}
"#;

fn html_escape(s: &str) -> String {
    // `&` must be replaced first. Quotes are escaped too so this stays a
    // correct escaper if it's ever reused for an attribute value (today it
    // only wraps the <title> element text).
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

#[cfg(test)]
mod ext_tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn markdown_extensions_are_accepted() {
        for ext in ["md", "markdown", "mdx", "mkd"] {
            let p = PathBuf::from(format!("foo.{ext}"));
            assert!(looks_like_markdown(&p), ".{ext} should look like markdown");
            assert!(looks_like_editable(&p), ".{ext} should be editable");
        }
    }

    #[test]
    fn canvas_extension_is_accepted_for_editable_only() {
        let p = PathBuf::from("foo.canvas");
        assert!(looks_like_canvas(&p));
        assert!(looks_like_editable(&p));
        // It's not a Markdown file though.
        assert!(!looks_like_markdown(&p));
    }

    #[test]
    fn extensions_are_case_insensitive() {
        for ext in ["MD", "MarkDown", "Canvas", "CANVAS"] {
            let p = PathBuf::from(format!("foo.{ext}"));
            assert!(
                looks_like_editable(&p),
                ".{ext} should be editable (case-insensitive match)"
            );
        }
    }

    #[test]
    fn unrelated_extensions_are_rejected() {
        for path in ["foo.txt", "foo.pdf", "foo.docx", "foo", "canvas", ".canvas"] {
            let p = PathBuf::from(path);
            assert!(
                !looks_like_editable(&p),
                "{path} should not look editable"
            );
        }
    }

    #[tokio::test]
    async fn read_file_inner_reads_a_canvas_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("scratch.canvas");
        let payload = r#"{"nodes":[],"edges":[]}"#;
        tokio::fs::write(&path, payload).await.unwrap();
        let loaded = read_file_inner(&path).await.expect("should read .canvas");
        assert_eq!(loaded.content, payload);
        assert!(loaded.path.ends_with("scratch.canvas"));
        assert!(loaded.mtime_ms > 0);
    }

    #[tokio::test]
    async fn read_file_inner_rejects_unsupported_extensions() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nope.txt");
        tokio::fs::write(&path, "irrelevant").await.unwrap();
        let result = read_file_inner(&path).await;
        assert!(matches!(result, Err(AppError::NotMarkdown(_))));
    }

    #[test]
    fn html_escape_covers_quotes_and_angle_brackets() {
        assert_eq!(
            html_escape("<a href=\"x\" title='y'>&"),
            "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;"
        );
    }

    #[tokio::test]
    async fn write_image_rejects_path_traversal() {
        let dir = tempfile::tempdir().unwrap();
        let root_dir = dir.path().join("vault");
        std::fs::create_dir(&root_dir).unwrap();
        let root = root_dir.to_string_lossy().into_owned();
        let res = write_image(root, "../escape".to_string(), vec![1, 2, 3], "png".to_string()).await;
        assert!(matches!(res, Err(AppError::Other(_))), "../ must be rejected");
        // "../escape" from root would land at dir.path()/escape — guard fires
        // before any directory is created, so nothing escaped the vault.
        assert!(!dir.path().join("escape").exists());
    }

    #[tokio::test]
    async fn write_image_writes_into_a_vault_subdir() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_string_lossy().into_owned();
        let rel = write_image(root, "assets".to_string(), vec![1, 2, 3], "png".to_string())
            .await
            .expect("a normal subdir write should succeed");
        assert!(rel.starts_with("assets"), "rel path was {rel}");
        assert!(dir.path().join(&rel).exists());
    }
}

#[cfg(test)]
mod render_tests {
    use super::*;

    // Tests exercise the real pipeline (`render_markdown_document`) — the
    // public `render_html` command just unwraps Strings and awaits it.
    use super::render_markdown_document as run_render;

    #[test]
    fn print_rules_include_page_size_and_break_hints() {
        assert!(PRINT_RULES.contains("@page"));
        assert!(PRINT_RULES.contains("size: A4"));
        assert!(PRINT_RULES.contains("break-inside: avoid"));
    }

    #[test]
    fn theme_css_unknown_falls_back_to_github() {
        assert_eq!(theme_css("zhgrf"), theme_css("github"));
    }

    #[test]
    fn theme_css_distinguishes_known_themes() {
        let g = theme_css("github");
        let p = theme_css("plain");
        let t = theme_css("tufte");
        assert!(g != p && p != t && g != t);
        assert!(p.contains("Georgia"));
        assert!(t.contains("Palatino") || t.contains("et-book"));
    }

    #[test]
    fn render_emits_doctype_and_body_for_each_theme() {
        for theme in ["github", "plain", "tufte"] {
            let html = run_render("# Hi\n\nbody", Some("X"), Some(theme));
            assert!(html.starts_with("<!doctype html>"));
            assert!(html.contains("<title>X</title>"));
            assert!(html.contains("<h1"));
            assert!(html.contains("body"));
        }
    }

    #[test]
    fn render_escapes_html_special_chars_in_title() {
        let html = run_render("body", Some("<bad>"), None);
        assert!(html.contains("<title>&lt;bad&gt;</title>"));
    }

    #[test]
    fn render_supports_gfm_extensions() {
        let html = run_render("| a | b |\n|---|---|\n| 1 | 2 |", None, None);
        assert!(html.contains("<table>"));
        let html = run_render("~~old~~", None, None);
        assert!(html.contains("<del>"));
        let html = run_render("- [x] done", None, None);
        assert!(html.contains("type=\"checkbox\""));
        let html = run_render("https://example.com", None, None);
        assert!(html.contains("href=\"https://example.com\""));
    }

    #[test]
    fn render_adds_heading_ids_for_anchors() {
        let html = run_render("## Some Section", None, None);
        // comrak slugifies the heading text into a stable id.
        assert!(html.contains(r#"id="some-section""#), "html: {html}");
    }

    #[test]
    fn render_highlights_code_fences_with_inline_styles() {
        let html = run_render("```ts\nconst x: number = 1;\n```", None, None);
        // syntect emits inline-styled spans — self-contained, no external CSS.
        assert!(html.contains("<span style=\"color:"), "html: {html}");
        // Keyword/identifier text survives the highlight.
        assert!(html.contains("const"));
    }

    #[test]
    fn render_routes_mermaid_fence_to_a_mermaid_block() {
        let html = run_render("```mermaid\ngraph LR\n  A --> B\n```", None, None);
        assert!(html.contains(r#"<pre class="mermaid">"#), "html: {html}");
        // Diagram source is preserved verbatim (not syntax-highlighted).
        assert!(html.contains("graph LR"));
        assert!(!html.contains("<span style=\"color:")); // no syntect coloring
    }

    #[test]
    fn render_injects_mermaid_assets_only_when_a_diagram_is_present() {
        let with = run_render("```mermaid\ngraph LR\nA-->B\n```", None, None);
        assert!(with.contains("mermaid.esm.min.mjs"));
        assert!(with.contains("mermaid.initialize"));
        let without = run_render("just prose", None, None);
        // The common CSS mentions `.mermaid`; assert the *script* isn't pulled.
        assert!(!without.contains("mermaid.esm.min.mjs"));
        assert!(!without.contains("mermaid.initialize"));
    }

    #[test]
    fn render_emits_math_nodes_and_injects_katex_when_math_present() {
        let html = run_render("Inline $a^2 + b^2 = c^2$ done", None, None);
        // AST-level math node, not a text scan.
        assert!(html.contains(r#"data-math-style="inline""#), "html: {html}");
        assert!(html.contains("katex.min.css"));
        assert!(html.contains("katex.render"));
    }

    #[test]
    fn render_handles_display_math_blocks() {
        let html = run_render("$$\n\\int_0^1 x\\,dx\n$$", None, None);
        assert!(html.contains(r#"data-math-style="display""#), "html: {html}");
    }

    #[test]
    fn render_does_not_treat_currency_as_math() {
        // The classic false-positive a naive text scan would mangle.
        let html = run_render("It cost between $5 and $10 total.", None, None);
        // The common CSS has the selector `pre[data-math-style]`; a real math
        // node carries `data-math-style="inline|display"` — assert none exist.
        assert!(!html.contains(r#"data-math-style=""#), "html: {html}");
        // The common CSS mentions `.katex-display`; assert the renderer
        // assets themselves aren't injected.
        assert!(!html.contains("katex.min.js"), "html: {html}");
    }

    #[test]
    fn render_stays_self_contained_without_math_or_diagrams() {
        let html = run_render("# Title\n\nSome **prose** and `code`.", None, None);
        assert!(!html.contains("cdn.jsdelivr.net"), "html: {html}");
    }

    #[test]
    fn render_tags_task_lists_with_github_classes() {
        // A *loose* task list (blank lines between items) used to strand the
        // checkbox above its text; the classes let CSS keep them inline.
        let html = run_render("- [x] done\n\n- [ ] todo", None, None);
        assert!(html.contains(r#"class="contains-task-list""#), "html: {html}");
        assert!(html.contains(r#"class="task-list-item""#), "html: {html}");
        assert!(html.contains(r#"type="checkbox""#));
    }

    #[test]
    fn common_css_keeps_loose_list_items_tight() {
        // The fix hinges on collapsing the <p> margins comrak adds inside
        // loose-list items and keeping the task checkbox inline.
        assert!(COMMON_CSS.contains("li > p"));
        assert!(COMMON_CSS.contains(".task-list-item > input[type=\"checkbox\"] + p"));
    }
}

/// Append a perf observation to ~/Library/Logs/markup/perf.log.
/// Used by Spike 0.2 instrumentation. Failures are ignored.
#[tauri::command]
pub async fn log_perf(app: tauri::AppHandle, label: String, ms: f64) -> AppResult<()> {
    let log_dir = app
        .path()
        .home_dir()
        .map_err(|e| AppError::Other(format!("home_dir: {e}")))?
        .join("Library/Logs/markup");
    let _ = tokio::fs::create_dir_all(&log_dir).await;
    let log_path = log_dir.join("perf.log");
    let line = format!(
        "{}\t{}\t{:.2}\n",
        chrono_now_iso(),
        label,
        ms
    );
    let line_bytes = line.into_bytes();
    let _ = tokio::task::spawn_blocking(move || {
        std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .and_then(|mut f| f.write_all(&line_bytes))
    })
    .await;
    Ok(())
}

fn chrono_now_iso() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}.{:03}", now.as_secs(), now.subsec_millis())
}

#[tauri::command]
pub async fn write_file(
    path: String,
    content: String,
    expected_mtime_ms: Option<u128>,
) -> AppResult<u128> {
    let path_buf = PathBuf::from(&path);

    if let Some(expected) = expected_mtime_ms {
        if let Ok(meta) = tokio::fs::metadata(&path_buf).await {
            let actual = mtime_ms(&meta);
            // tolerate small skew; cross-fs mtime can drift up to 1s
            if actual > expected && actual - expected > 1500 {
                return Err(AppError::StaleMtime);
            }
        }
    }

    // Atomic write via temp + rename in the same directory
    let parent = path_buf
        .parent()
        .ok_or_else(|| AppError::Other("path has no parent".into()))?;
    let file_name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::Other("path has no file name".into()))?;
    let tmp = parent.join(format!(".{file_name}.markup.tmp"));

    tokio::fs::write(&tmp, content.as_bytes()).await?;
    tokio::fs::rename(&tmp, &path_buf).await?;

    let meta = tokio::fs::metadata(&path_buf).await?;
    Ok(mtime_ms(&meta))
}
