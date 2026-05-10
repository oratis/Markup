import { describe, expect, it } from "vitest";
import type { VaultFile } from "../store";
import { findVaultFile, wikilinkAtClick } from "./wikilink";

const file = (path: string): VaultFile => {
  const name = path.split("/").pop() ?? path;
  return { path, relPath: path, name, mtimeMs: 0, size: 0 };
};

describe("findVaultFile", () => {
  const files = [file("/v/notes/Foo.md"), file("/v/notes/bar.md"), file("/v/zh/笔记.md")];

  it("finds exact basename", () => {
    expect(findVaultFile(files, "Foo.md")?.path).toBe("/v/notes/Foo.md");
  });

  it("finds basename without extension", () => {
    expect(findVaultFile(files, "Foo")?.path).toBe("/v/notes/Foo.md");
    expect(findVaultFile(files, "bar")?.path).toBe("/v/notes/bar.md");
  });

  it("falls back to case-insensitive match", () => {
    expect(findVaultFile(files, "foo")?.path).toBe("/v/notes/Foo.md");
    expect(findVaultFile(files, "BAR")?.path).toBe("/v/notes/bar.md");
  });

  it("supports unicode names", () => {
    expect(findVaultFile(files, "笔记")?.path).toBe("/v/zh/笔记.md");
  });

  it("returns null for missing", () => {
    expect(findVaultFile(files, "missing")).toBeNull();
    expect(findVaultFile(files, "  ")).toBeNull();
  });
});

describe("wikilinkAtClick", () => {
  function textNode(content: string): Text {
    return document.createTextNode(content);
  }

  it("returns the captured name when offset is inside a wikilink", () => {
    const t = textNode("see [[Foo]] for details");
    expect(wikilinkAtClick(t, 6)).toBe("Foo");
    expect(wikilinkAtClick(t, 9)).toBe("Foo");
  });

  it("returns null when offset is outside any wikilink", () => {
    const t = textNode("see [[Foo]] for details");
    expect(wikilinkAtClick(t, 0)).toBeNull();
    expect(wikilinkAtClick(t, 22)).toBeNull();
  });

  it("supports multiple wikilinks in one text node", () => {
    const t = textNode("[[A]] and [[B-name]]");
    expect(wikilinkAtClick(t, 1)).toBe("A");
    expect(wikilinkAtClick(t, 11)).toBe("B-name");
  });

  it("strips |label suffix", () => {
    const t = textNode("see [[Foo|the foo]] for details");
    expect(wikilinkAtClick(t, 6)).toBe("Foo");
  });

  it("returns null for non-text nodes", () => {
    const div = document.createElement("div");
    expect(wikilinkAtClick(div, 0)).toBeNull();
    expect(wikilinkAtClick(null, 0)).toBeNull();
  });
});
