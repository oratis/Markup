/**
 * Daily-note & template helpers — pure, testable. The "Open Today's
 * Daily Note" palette command (in App.tsx) and a future "Insert
 * Template" command both consume these.
 *
 * Date format tokens supported (subset of moment.js — enough for the
 * common YYYY-MM-DD use case; we can extend with locale-aware tokens
 * later if users ask):
 *   YYYY  4-digit year
 *   MM    2-digit month (01-12)
 *   DD    2-digit day of month (01-31)
 *   HH    2-digit hour (00-23)
 *   mm    2-digit minute (00-59)
 *   ss    2-digit second (00-59)
 *
 * Template variables ({{…}}):
 *   {{title}}            — file basename without extension
 *   {{date}}             — current date in `YYYY-MM-DD`
 *   {{date:FMT}}         — current date in `FMT`
 *   {{time}}             — current time in `HH:mm`
 *   {{time:FMT}}         — current time in `FMT`
 *   {{cursor}}           — replaced with empty string; its position is
 *                          returned so the caller can place the caret there
 */

const TOKEN_RE = /YYYY|MM|DD|HH|mm|ss/g;

/** Format `date` with `fmt`. Unknown sequences are left as-is. */
export function formatDate(date: Date, fmt: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return fmt.replace(TOKEN_RE, (tok) => {
    switch (tok) {
      case "YYYY":
        return String(date.getFullYear());
      case "MM":
        return pad(date.getMonth() + 1);
      case "DD":
        return pad(date.getDate());
      case "HH":
        return pad(date.getHours());
      case "mm":
        return pad(date.getMinutes());
      case "ss":
        return pad(date.getSeconds());
      default:
        return tok;
    }
  });
}

export interface TemplateContext {
  /** Date used to resolve {{date}} / {{time}}. Defaults to now at call site. */
  date: Date;
  /** Used for {{title}}. */
  title?: string;
}

export interface TemplateResult {
  /** Final substituted text with {{cursor}} removed. */
  text: string;
  /** 0-based offset where {{cursor}} was (in `text`), or -1 if no marker. */
  cursorPos: number;
}

/** Substitute template variables and locate {{cursor}}. The cursor
 *  marker is removed from the output; only its first occurrence counts. */
export function applyTemplate(template: string, ctx: TemplateContext): TemplateResult {
  // First, replace non-cursor tokens.
  let out = template
    .replace(/\{\{title\}\}/g, ctx.title ?? "")
    .replace(/\{\{date:([^}]+)\}\}/g, (_m, fmt) => formatDate(ctx.date, fmt))
    .replace(/\{\{date\}\}/g, formatDate(ctx.date, "YYYY-MM-DD"))
    .replace(/\{\{time:([^}]+)\}\}/g, (_m, fmt) => formatDate(ctx.date, fmt))
    .replace(/\{\{time\}\}/g, formatDate(ctx.date, "HH:mm"));

  // Locate and strip cursor.
  const cursorIdx = out.indexOf("{{cursor}}");
  if (cursorIdx < 0) return { text: out, cursorPos: -1 };
  out = out.slice(0, cursorIdx) + out.slice(cursorIdx + "{{cursor}}".length);
  return { text: out, cursorPos: cursorIdx };
}

/**
 * Resolve a daily-note path inside a vault.
 *   - `root`: absolute vault root, e.g. "/Users/x/vault"
 *   - `folder`: optional sub-folder relative to root (default "")
 *   - `format`: filename format string (default "YYYY-MM-DD")
 *   - `date`: defaults to today
 *
 *  Returns the absolute path with a ".md" extension. Folder slashes
 *  in `folder` are tolerated and normalised. The format may itself
 *  contain `/` (e.g. "YYYY/MM/DD" creates year/month sub-folders).
 */
export function dailyNotePath(
  root: string,
  folder: string,
  format: string,
  date: Date = new Date(),
): string {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "").trim();
  const name = formatDate(date, format);
  const parts = [root.replace(/\/+$/, "")];
  if (cleanFolder) parts.push(cleanFolder);
  parts.push(name.endsWith(".md") ? name : `${name}.md`);
  return parts.join("/");
}
