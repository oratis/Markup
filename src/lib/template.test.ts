import { describe, expect, it } from "vitest";
import { applyTemplate, dailyNotePath, formatDate } from "./template";

const D = new Date(2026, 4, 12, 14, 7, 3); // May 12, 2026 14:07:03 local

describe("formatDate", () => {
  it("expands YYYY-MM-DD", () => {
    expect(formatDate(D, "YYYY-MM-DD")).toBe("2026-05-12");
  });

  it("zero-pads single-digit months and days", () => {
    const d = new Date(2026, 0, 3); // Jan 3
    expect(formatDate(d, "YYYY-MM-DD")).toBe("2026-01-03");
  });

  it("expands time tokens", () => {
    expect(formatDate(D, "HH:mm:ss")).toBe("14:07:03");
  });

  it("supports mixed date + time", () => {
    expect(formatDate(D, "YYYY-MM-DD HH:mm")).toBe("2026-05-12 14:07");
  });

  it("leaves unknown tokens alone", () => {
    expect(formatDate(D, "[Today: ]YYYY")).toBe("[Today: ]2026");
  });

  it("supports slash-separated date folders", () => {
    expect(formatDate(D, "YYYY/MM/DD")).toBe("2026/05/12");
  });
});

describe("applyTemplate", () => {
  it("replaces {{date}} with YYYY-MM-DD by default", () => {
    expect(applyTemplate("Hello {{date}}", { date: D })).toEqual({
      text: "Hello 2026-05-12",
      cursorPos: -1,
    });
  });

  it("replaces {{time}} with HH:mm by default", () => {
    expect(applyTemplate("at {{time}}", { date: D })).toEqual({
      text: "at 14:07",
      cursorPos: -1,
    });
  });

  it("honours {{date:FMT}} custom format", () => {
    expect(applyTemplate("d={{date:MM-DD}}", { date: D })).toEqual({
      text: "d=05-12",
      cursorPos: -1,
    });
  });

  it("replaces {{title}}", () => {
    expect(applyTemplate("Title: {{title}}", { date: D, title: "Notes" })).toEqual({
      text: "Title: Notes",
      cursorPos: -1,
    });
  });

  it("falls back to empty string for missing title", () => {
    expect(applyTemplate("X={{title}}=Y", { date: D })).toEqual({
      text: "X==Y",
      cursorPos: -1,
    });
  });

  it("strips {{cursor}} and returns its offset", () => {
    const r = applyTemplate("Pre {{cursor}}Post", { date: D });
    expect(r.text).toBe("Pre Post");
    expect(r.cursorPos).toBe(4);
  });

  it("returns -1 cursorPos when no cursor marker", () => {
    expect(applyTemplate("plain", { date: D }).cursorPos).toBe(-1);
  });

  it("combines all token kinds in one template", () => {
    const tpl = "# {{title}} — {{date}}\n\n## Plan\n{{cursor}}\n## Done\n";
    const r = applyTemplate(tpl, { date: D, title: "Daily" });
    expect(r.text).toBe("# Daily — 2026-05-12\n\n## Plan\n\n## Done\n");
    expect(r.cursorPos).toBe(r.text.indexOf("\n## Done"));
  });
});

describe("dailyNotePath", () => {
  it("joins root + format with .md extension", () => {
    expect(dailyNotePath("/vault", "", "YYYY-MM-DD", D)).toBe("/vault/2026-05-12.md");
  });

  it("inserts a folder when given", () => {
    expect(dailyNotePath("/vault", "journal", "YYYY-MM-DD", D)).toBe(
      "/vault/journal/2026-05-12.md",
    );
  });

  it("supports slash-format for date-based sub-folders", () => {
    expect(dailyNotePath("/vault", "journal", "YYYY/MM/DD", D)).toBe(
      "/vault/journal/2026/05/12.md",
    );
  });

  it("strips surrounding slashes from folder", () => {
    expect(dailyNotePath("/vault", "/journal/", "YYYY-MM-DD", D)).toBe(
      "/vault/journal/2026-05-12.md",
    );
  });

  it("respects an existing .md in the format", () => {
    expect(dailyNotePath("/vault", "", "Daily-YYYY-MM-DD.md", D)).toBe(
      "/vault/Daily-2026-05-12.md",
    );
  });

  it("trims trailing slashes from root", () => {
    expect(dailyNotePath("/vault/", "", "YYYY-MM-DD", D)).toBe("/vault/2026-05-12.md");
  });
});
