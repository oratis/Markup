import { describe, expect, it } from "vitest";
import { stripMarkdown } from "./strip-md";

describe("stripMarkdown", () => {
  it("strips ATX headings", () => {
    expect(stripMarkdown("# Foo\n## Bar")).toBe("Foo\nBar");
  });

  it("strips bullet / numbered / task list markers", () => {
    expect(stripMarkdown("- a\n* b\n1. c\n- [ ] d\n- [x] e")).toBe("a\nb\nc\nd\ne");
  });

  it("strips blockquote prefix", () => {
    expect(stripMarkdown("> quoted\n> still quoted")).toBe("quoted\nstill quoted");
  });

  it("strips inline bold / italic / strike / code", () => {
    expect(stripMarkdown("**b** *i* ~~s~~ `c`")).toBe("b i s c");
  });

  it("strips links and keeps the visible text", () => {
    expect(stripMarkdown("[link](https://x.com) and ![alt](img.png)")).toBe(
      "link and alt",
    );
  });

  it("collapses wikilink display text", () => {
    expect(stripMarkdown("[[Page]] and [[Page|Alias]]")).toBe("Page and Alias");
  });

  it("preserves code-fence interior text", () => {
    const md = "```ts\nconst x = 1;\n```";
    expect(stripMarkdown(md)).toBe("const x = 1;");
  });

  it("converts horizontal rules to blank lines", () => {
    expect(stripMarkdown("foo\n\n---\n\nbar")).toBe("foo\n\n\n\nbar");
  });
});
