import { describe, expect, it, vi } from "vitest";
import { installSmartPaste, looksLikeUrl } from "./smart-paste";

describe("looksLikeUrl", () => {
  it("accepts http(s)", () => {
    expect(looksLikeUrl("https://example.com")).toBe(true);
    expect(looksLikeUrl("http://localhost:3000/x")).toBe(true);
  });
  it("accepts mailto: and markup://", () => {
    expect(looksLikeUrl("mailto:a@b.co")).toBe(true);
    expect(looksLikeUrl("markup://Welcome")).toBe(true);
  });
  it("rejects plain text and unrelated schemes", () => {
    expect(looksLikeUrl("just a sentence")).toBe(false);
    expect(looksLikeUrl("ftp://x.example")).toBe(false);
    expect(looksLikeUrl("https://has spaces/in it")).toBe(false);
  });
  it("trims surrounding whitespace before testing", () => {
    expect(looksLikeUrl("  https://x.example  ")).toBe(true);
  });
});

function makePaste(text: string, kind: "string" | "image" = "string") {
  const items =
    kind === "image"
      ? [{ kind: "file", type: "image/png" }]
      : [{ kind: "string", type: "text/plain" }];
  const ev = new Event("paste", { cancelable: true, bubbles: true }) as ClipboardEvent;
  Object.defineProperty(ev, "clipboardData", {
    value: {
      getData: (k: string) => (k === "text/plain" ? text : ""),
      items,
    },
  });
  return ev;
}

describe("installSmartPaste", () => {
  it("wraps the selection as [text](url) when the clipboard is a URL", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const insertLink = vi.fn().mockReturnValue(true);
    const detach = installSmartPaste(host, {
      insertLink,
      getSelectionText: () => "Anthropic",
    });
    const ev = makePaste("https://anthropic.com");
    host.dispatchEvent(ev);
    expect(insertLink).toHaveBeenCalledWith("[Anthropic](https://anthropic.com)");
    expect(ev.defaultPrevented).toBe(true);
    detach();
    document.body.removeChild(host);
  });

  it("does nothing when no text is selected", () => {
    const host = document.createElement("div");
    const insertLink = vi.fn();
    installSmartPaste(host, { insertLink, getSelectionText: () => "" });
    const ev = makePaste("https://x.example");
    host.dispatchEvent(ev);
    expect(insertLink).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });

  it("ignores non-URL pastes (lets native paste run)", () => {
    const host = document.createElement("div");
    const insertLink = vi.fn();
    installSmartPaste(host, { insertLink, getSelectionText: () => "selected" });
    const ev = makePaste("just a normal phrase");
    host.dispatchEvent(ev);
    expect(insertLink).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });

  it("ignores image pastes (image-paste handler runs instead)", () => {
    const host = document.createElement("div");
    const insertLink = vi.fn();
    installSmartPaste(host, { insertLink, getSelectionText: () => "selected" });
    const ev = makePaste("https://x.example", "image");
    host.dispatchEvent(ev);
    expect(insertLink).not.toHaveBeenCalled();
  });

  it("detach removes the listener", () => {
    const host = document.createElement("div");
    const insertLink = vi.fn().mockReturnValue(true);
    const detach = installSmartPaste(host, {
      insertLink,
      getSelectionText: () => "x",
    });
    detach();
    host.dispatchEvent(makePaste("https://x.example"));
    expect(insertLink).not.toHaveBeenCalled();
  });

  it("escapes ] in the selection so the link text doesn't break", () => {
    const host = document.createElement("div");
    const insertLink = vi.fn().mockReturnValue(true);
    installSmartPaste(host, { insertLink, getSelectionText: () => "foo]bar" });
    host.dispatchEvent(makePaste("https://x.example"));
    expect(insertLink).toHaveBeenCalledWith("[foo\\]bar](https://x.example)");
  });

  it("lets native paste run for a multi-line selection", () => {
    const host = document.createElement("div");
    const insertLink = vi.fn();
    installSmartPaste(host, { insertLink, getSelectionText: () => "line1\nline2" });
    const ev = makePaste("https://x.example");
    host.dispatchEvent(ev);
    expect(insertLink).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });
});
