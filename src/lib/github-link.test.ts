import { describe, expect, it } from "vitest";
import {
  childLink,
  contentsApiUrl,
  fileName,
  type GitHubLink,
  parseContents,
  parseGitHubLink,
  parseRepos,
  rawUrl,
  repoLink,
} from "./github-link";

describe("parseGitHubLink", () => {
  it("parses a blob file URL", () => {
    expect(
      parseGitHubLink("https://github.com/oratis/Markup/blob/main/docs/TODO.md"),
    ).toEqual({
      owner: "oratis",
      repo: "Markup",
      ref: "main",
      path: "docs/TODO.md",
      isDirectory: false,
    });
  });

  it("parses a tree folder URL", () => {
    const l = parseGitHubLink("https://github.com/o/r/tree/main/docs");
    expect(l?.isDirectory).toBe(true);
    expect(l?.path).toBe("docs");
  });

  it("parses repo root and raw URLs", () => {
    expect(parseGitHubLink("github.com/o/r")).toEqual({
      owner: "o",
      repo: "r",
      ref: null,
      path: "",
      isDirectory: true,
    });
    expect(parseGitHubLink("https://raw.githubusercontent.com/o/r/abc/a/b.md")).toEqual({
      owner: "o",
      repo: "r",
      ref: "abc",
      path: "a/b.md",
      isDirectory: false,
    });
  });

  it("parses a bare owner/repo", () => {
    expect(parseGitHubLink("oratis/Markup")).toEqual({
      owner: "oratis",
      repo: "Markup",
      ref: null,
      path: "",
      isDirectory: true,
    });
    expect(parseGitHubLink("a/b/c")).toBeNull();
  });

  it("strips .git, decodes the path, and rejects non-GitHub", () => {
    const l = parseGitHubLink("https://github.com/o/r.git/blob/main/a%20b.md");
    expect(l?.repo).toBe("r");
    expect(l?.path).toBe("a b.md");
    expect(parseGitHubLink("https://example.com/o/r")).toBeNull();
    expect(parseGitHubLink("nonsense !!")).toBeNull();
  });
});

describe("url builders", () => {
  const file: GitHubLink = {
    owner: "o",
    repo: "r",
    ref: "main",
    path: "a b/c.md",
    isDirectory: false,
  };

  it("builds the contents API + raw URLs", () => {
    expect(contentsApiUrl(file)).toBe(
      "https://api.github.com/repos/o/r/contents/a b/c.md?ref=main",
    );
    expect(rawUrl(file)).toBe("https://raw.githubusercontent.com/o/r/main/a%20b/c.md");
    expect(fileName(file)).toBe("c.md");
    expect(
      rawUrl({ owner: "o", repo: "r", ref: null, path: "", isDirectory: true }),
    ).toBeNull();
  });
});

describe("parseContents + childLink", () => {
  it("sorts folders first then files alphabetically", () => {
    const entries = parseContents([
      { name: "README.md", path: "README.md", type: "file" },
      { name: "docs", path: "docs", type: "dir" },
      { name: "app.ts", path: "src/app.ts", type: "file" },
    ]);
    expect(entries.map((e) => e.name)).toEqual(["docs", "app.ts", "README.md"]);
    expect(entries[0].isDir).toBe(true);
    expect(parseContents("not an array")).toEqual([]);
  });

  it("builds a child link for navigation", () => {
    const parent: GitHubLink = {
      owner: "o",
      repo: "r",
      ref: "main",
      path: "docs",
      isDirectory: true,
    };
    expect(childLink(parent, { name: "a.md", path: "docs/a.md", isDir: false })).toEqual({
      owner: "o",
      repo: "r",
      ref: "main",
      path: "docs/a.md",
      isDirectory: false,
    });
  });
});

describe("parseRepos", () => {
  it("parses repos, private first then alphabetical", () => {
    const repos = parseRepos([
      { full_name: "octocat/zed", name: "zed", private: false },
      { full_name: "octocat/secret", name: "secret", private: true },
      { full_name: "octocat/apple", name: "apple", private: false },
      { full_name: "octocat/aaa-priv", name: "aaa-priv", private: true },
    ]);
    expect(repos.map((r) => r.fullName)).toEqual([
      "octocat/aaa-priv",
      "octocat/secret",
      "octocat/apple",
      "octocat/zed",
    ]);
    expect(repos[0].isPrivate).toBe(true);
  });

  it("returns [] for non-array or bad input", () => {
    expect(parseRepos("nope")).toEqual([]);
    expect(parseRepos([{ name: "x" }, null, 3])).toEqual([]);
  });

  it("builds a repo-root link, splitting owner/name from full_name", () => {
    expect(
      repoLink({
        fullName: "octocat/Hello-World",
        name: "Hello-World",
        isPrivate: false,
      }),
    ).toEqual({
      owner: "octocat",
      repo: "Hello-World",
      ref: null,
      path: "",
      isDirectory: true,
    });
  });
});
