/**
 * Short, collision-resistant id generator for canvas nodes/edges.
 * Obsidian uses 16-hex-char ids; we match that shape so .canvas files
 * we author look interchangeable with files authored in Obsidian.
 *
 * crypto.randomUUID is available in modern browsers and in the Tauri
 * webview; the fallback uses Math.random for non-secure contexts.
 */

export function newCanvasId(): string {
  // 16 hex chars = 64 bits of entropy → effectively collision-free
  // for any practical canvas size.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  let s = "";
  while (s.length < 16) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s.slice(0, 16);
}
