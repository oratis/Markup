import { describe, expect, it } from "vitest";
import { buildParagraphLink } from "./paragraph-link";

describe("buildParagraphLink", () => {
  const md = `# Top

Intro paragraph.

## Section A

Content under A.

\`\`\`md
## Not a heading
\`\`\`

## Section B

Inside B.
`;

  it("uses [[file#heading]] for the nearest preceding heading", () => {
    const cursorLine = md.split("\n").indexOf("Inside B.");
    expect(buildParagraphLink("/v/notes/foo.md", md, cursorLine)).toBe(
      "[[foo#Section B]]",
    );
  });

  it("ignores headings inside fenced code blocks", () => {
    const cursorLine = md.split("\n").indexOf("Content under A.");
    expect(buildParagraphLink("/v/notes/foo.md", md, cursorLine)).toBe(
      "[[foo#Section A]]",
    );
  });

  it("falls back to bare wikilink when no heading is above", () => {
    const noHeadings = "just some text\nmore text";
    expect(buildParagraphLink("/v/notes/foo.md", noHeadings, 1)).toBe("[[foo]]");
  });

  it("strips the .md extension on filename", () => {
    expect(buildParagraphLink("/v/notes/Foo.md", "# Title\nbody", 1)).toBe(
      "[[Foo#Title]]",
    );
  });

  it("falls back to a heading-as-text when no path", () => {
    expect(buildParagraphLink(null, "# Welcome\nbody", 1)).toBe("## Welcome");
  });
});
