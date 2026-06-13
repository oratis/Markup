import { describe, expect, it } from "vitest";
import { isExternalHref, resolveDocHref } from "./relative-link";

describe("isExternalHref", () => {
  it("flags http(s) and mailto", () => {
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("http://x")).toBe(true);
    expect(isExternalHref("mailto:a@b.com")).toBe(true);
  });
  it("rejects relative + in-page links", () => {
    expect(isExternalHref("./a.md")).toBe(false);
    expect(isExternalHref("#heading")).toBe(false);
    expect(isExternalHref("../x/y.md")).toBe(false);
  });
});

describe("resolveDocHref", () => {
  const cur = "/vault/docs/guides/setup.md";

  it("resolves a sibling doc", () => {
    expect(resolveDocHref("./intro.md", cur)).toEqual({
      path: "/vault/docs/guides/intro.md",
      heading: null,
    });
    expect(resolveDocHref("intro.md", cur)).toEqual({
      path: "/vault/docs/guides/intro.md",
      heading: null,
    });
  });

  it("resolves ../ parent traversal and keeps the #heading", () => {
    expect(resolveDocHref("../api/client.md#auth", cur)).toEqual({
      path: "/vault/docs/api/client.md",
      heading: "auth",
    });
  });

  it("decodes percent-encoded paths and fragments", () => {
    expect(resolveDocHref("./a%20b.md#a%20section", cur)).toEqual({
      path: "/vault/docs/guides/a b.md",
      heading: "a section",
    });
  });

  it("returns null for external, scheme, in-page, and non-doc links", () => {
    expect(resolveDocHref("https://example.com/x.md", cur)).toBeNull();
    expect(resolveDocHref("mailto:a@b.com", cur)).toBeNull();
    expect(resolveDocHref("#section", cur)).toBeNull();
    expect(resolveDocHref("./diagram.png", cur)).toBeNull();
    expect(resolveDocHref("//cdn.example.com/x.md", cur)).toBeNull();
  });
});
