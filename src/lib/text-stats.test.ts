import { describe, expect, it } from "vitest";
import { byteSize, countWords, humanSize } from "./text-stats";

describe("countWords", () => {
  it("counts whitespace-separated tokens", () => {
    expect(countWords("hello world from markup")).toBe(4);
  });

  it("counts each CJK character as a word", () => {
    expect(countWords("欢迎使用")).toBe(4);
  });

  it("mixes CJK + non-CJK", () => {
    expect(countWords("hello 世界 markup")).toBe(4);
  });

  it("returns 0 for empty / whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\n  ")).toBe(0);
  });

  it("treats multiple whitespace types as one boundary", () => {
    expect(countWords("a\tb\nc d")).toBe(4);
  });

  // Regression: kana / Hangul have no inter-word spaces, so before they were
  // added to the CJK class a whole sentence counted as a single word.
  it("counts Japanese kana per character", () => {
    expect(countWords("ありがとう")).toBe(5); // 5 hiragana
    expect(countWords("カタカナ")).toBe(4); // 4 katakana
  });

  it("counts Korean Hangul syllables per character", () => {
    expect(countWords("안녕하세요")).toBe(5);
  });
});

describe("byteSize", () => {
  it("returns 0 for empty string", () => {
    expect(byteSize("")).toBe(0);
  });

  it("returns the character count for plain ASCII", () => {
    expect(byteSize("hello")).toBe(5);
  });

  it("returns multi-byte length for non-ASCII", () => {
    // "你" is 3 UTF-8 bytes
    expect(byteSize("你")).toBe(3);
  });
});

describe("humanSize", () => {
  it("renders bytes under 1KB with B suffix", () => {
    expect(humanSize(0)).toBe("0 B");
    expect(humanSize(999)).toBe("999 B");
  });

  it("renders KB with one decimal", () => {
    expect(humanSize(1024)).toBe("1.0 KB");
    expect(humanSize(1536)).toBe("1.5 KB");
  });

  it("renders MB with one decimal", () => {
    expect(humanSize(1024 * 1024)).toBe("1.0 MB");
    expect(humanSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
