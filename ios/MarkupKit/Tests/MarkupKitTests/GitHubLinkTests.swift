import Testing
@testable import MarkupKit

@Suite("GitHubLinkParser")
struct GitHubLinkTests {
    @Test func parsesBlobFileURL() {
        let l = GitHubLinkParser.parse(
            "https://github.com/oratis/Markup/blob/main/docs/TODO.md")
        #expect(l == GitHubLink(owner: "oratis", repo: "Markup", ref: "main",
                                path: "docs/TODO.md", isDirectory: false))
        #expect(l?.fileName == "TODO.md")
    }

    @Test func parsesTreeFolderURL() {
        let l = GitHubLinkParser.parse("https://github.com/oratis/Markup/tree/main/docs")
        #expect(l?.isDirectory == true)
        #expect(l?.path == "docs")
    }

    @Test func parsesRepoRoot() {
        let l = GitHubLinkParser.parse("github.com/oratis/Markup")
        #expect(l == GitHubLink(owner: "oratis", repo: "Markup", isDirectory: true))
    }

    @Test func parsesRawURL() {
        let l = GitHubLinkParser.parse(
            "https://raw.githubusercontent.com/o/r/abc123/a/b.md")
        #expect(l == GitHubLink(owner: "o", repo: "r", ref: "abc123",
                                path: "a/b.md", isDirectory: false))
    }

    @Test func stripsDotGitAndDecodesPath() {
        let l = GitHubLinkParser.parse("https://github.com/o/r.git/blob/main/a%20b.md")
        #expect(l?.repo == "r")
        #expect(l?.path == "a b.md")
    }

    @Test func rejectsNonGitHub() {
        #expect(GitHubLinkParser.parse("https://example.com/o/r") == nil)
        #expect(GitHubLinkParser.parse("not a url at all !!") == nil)
    }

    @Test func buildsRawURL() {
        let l = GitHubLink(owner: "o", repo: "r", ref: "main", path: "a b/c.md")
        #expect(GitHubLinkParser.rawURL(l)
            == "https://raw.githubusercontent.com/o/r/main/a%20b/c.md")
        // No ref or directory → no raw URL.
        #expect(GitHubLinkParser.rawURL(GitHubLink(owner: "o", repo: "r", isDirectory: true)) == nil)
    }
}
