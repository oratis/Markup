import { describe, expect, it } from "vitest";
import {
  isExternalUrl,
  renderCanvasMarkdown,
  stripDangerousAttrs,
} from "./canvas-md-render";

describe("renderCanvasMarkdown", () => {
  it("returns empty string for empty input", () => {
    expect(renderCanvasMarkdown("")).toBe("");
    expect(renderCanvasMarkdown("   \n\t  ")).toBe("");
  });

  it("renders headings", () => {
    const out = renderCanvasMarkdown("# Hello");
    expect(out).toContain("<h1");
    expect(out).toContain("Hello");
  });

  it("renders bold + italic + inline code", () => {
    const out = renderCanvasMarkdown("**bold** *em* `code`");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>em</em>");
    expect(out).toContain("<code>code</code>");
  });

  it("renders bullet lists", () => {
    const out = renderCanvasMarkdown("- one\n- two");
    expect(out).toMatch(/<ul[^>]*>[\s\S]*<li[^>]*>one<\/li>/);
  });

  it("renders inline links", () => {
    const out = renderCanvasMarkdown("[link](https://example.com)");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain(">link</a>");
  });

  it("respects breaks:true so newlines become <br>", () => {
    const out = renderCanvasMarkdown("a\nb");
    expect(out).toMatch(/<br\s*\/?>/);
  });
});

describe("stripDangerousAttrs", () => {
  it("removes onclick / onerror handlers", () => {
    const out = stripDangerousAttrs(
      '<img src="x.png" onclick="alert(1)" onerror="alert(2)">',
    );
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("onerror");
    expect(out).toContain('src="x.png"');
  });

  it("neutralises javascript: hrefs", () => {
    const out = stripDangerousAttrs('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
    expect(out).toContain("#blocked");
  });

  it("neutralises data: urls in src", () => {
    const out = stripDangerousAttrs(
      '<img src="data:text/html,<script>alert(1)</script>">',
    );
    expect(out).not.toContain("data:");
  });

  it("leaves safe hrefs untouched", () => {
    const out = stripDangerousAttrs('<a href="https://example.com">x</a>');
    expect(out).toContain('href="https://example.com"');
  });
});

describe("renderCanvasMarkdown sanitisation", () => {
  it("drops handlers from rendered output (defence-in-depth)", () => {
    // marked itself escapes raw HTML so this is mostly trivia, but it
    // proves stripDangerousAttrs is in the pipeline.
    const out = renderCanvasMarkdown('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });
});

describe("isExternalUrl", () => {
  it("accepts http / https / mailto", () => {
    expect(isExternalUrl("https://example.com")).toBe(true);
    expect(isExternalUrl("http://example.com")).toBe(true);
    expect(isExternalUrl("mailto:foo@bar.com")).toBe(true);
  });

  it("rejects javascript / vbscript / data", () => {
    expect(isExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isExternalUrl("vbscript:msgbox 1")).toBe(false);
    expect(isExternalUrl("data:text/html,x")).toBe(false);
  });

  it("rejects null / undefined / relative", () => {
    expect(isExternalUrl(null)).toBe(false);
    expect(isExternalUrl(undefined)).toBe(false);
    expect(isExternalUrl("")).toBe(false);
    expect(isExternalUrl("./foo")).toBe(false);
  });
});
