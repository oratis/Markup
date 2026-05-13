import { describe, expect, it } from "vitest";
import { isCanvasPath, isMarkdownPath } from "./canvas-path";

describe("isCanvasPath", () => {
  it("matches .canvas (lowercase)", () => {
    expect(isCanvasPath("/notes/board.canvas")).toBe(true);
    expect(isCanvasPath("board.canvas")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isCanvasPath("Board.CANVAS")).toBe(true);
    expect(isCanvasPath("/notes/Board.Canvas")).toBe(true);
  });

  it("rejects other extensions", () => {
    expect(isCanvasPath("foo.md")).toBe(false);
    expect(isCanvasPath("foo.txt")).toBe(false);
    expect(isCanvasPath("foo.json")).toBe(false);
  });

  it("rejects bare names without extensions", () => {
    expect(isCanvasPath("canvas")).toBe(false);
    expect(isCanvasPath("/some/canvas")).toBe(false);
    expect(isCanvasPath("")).toBe(false);
  });

  it("rejects null / undefined", () => {
    expect(isCanvasPath(null)).toBe(false);
    expect(isCanvasPath(undefined)).toBe(false);
  });

  it("only looks at the final segment's extension", () => {
    expect(isCanvasPath("/dir.canvas/file.md")).toBe(false);
    expect(isCanvasPath("/dir.canvas/file.canvas")).toBe(true);
  });

  it("treats a leading-dot file as no extension", () => {
    expect(isCanvasPath(".canvas")).toBe(false);
    expect(isCanvasPath("/dir/.canvas")).toBe(false);
  });
});

describe("isMarkdownPath", () => {
  it("matches every supported markdown extension", () => {
    for (const ext of ["md", "markdown", "mdx", "mkd"]) {
      expect(isMarkdownPath(`note.${ext}`)).toBe(true);
      expect(isMarkdownPath(`note.${ext.toUpperCase()}`)).toBe(true);
    }
  });

  it("rejects canvas and unrelated extensions", () => {
    expect(isMarkdownPath("note.canvas")).toBe(false);
    expect(isMarkdownPath("note.txt")).toBe(false);
    expect(isMarkdownPath(null)).toBe(false);
  });
});
