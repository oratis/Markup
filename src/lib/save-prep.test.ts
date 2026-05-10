import { describe, expect, it } from "vitest";
import { trimTrailingWhitespace } from "./save-prep";

describe("trimTrailingWhitespace", () => {
  it("removes trailing spaces and tabs from each line", () => {
    expect(trimTrailingWhitespace("foo   \nbar\t\nbaz")).toBe("foo\nbar\nbaz");
  });

  it("preserves a terminating newline", () => {
    expect(trimTrailingWhitespace("foo \nbar \n")).toBe("foo\nbar\n");
  });

  it("does not touch leading whitespace", () => {
    expect(trimTrailingWhitespace("  indented  \n\tdeep\t")).toBe("  indented\n\tdeep");
  });

  it("returns identity when there's nothing to strip", () => {
    expect(trimTrailingWhitespace("clean\nlines\n")).toBe("clean\nlines\n");
  });

  it("handles an empty string", () => {
    expect(trimTrailingWhitespace("")).toBe("");
  });
});
