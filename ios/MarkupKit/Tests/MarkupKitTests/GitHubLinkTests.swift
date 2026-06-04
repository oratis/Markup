import Foundation
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

    @Test func parsesBareOwnerRepo() {
        #expect(GitHubLinkParser.parse("oratis/Markup")
            == GitHubLink(owner: "oratis", repo: "Markup", isDirectory: true))
        // Not a bare repo (3 segments) → still parses via URL rules / nil.
        #expect(GitHubLinkParser.parse("a/b/c") == nil)
    }

    @Test func parsesDirectoryListing() {
        let json = Data("""
        [{"name":"README.md","path":"README.md","type":"file"},
         {"name":"docs","path":"docs","type":"dir"},
         {"name":"app.swift","path":"src/app.swift","type":"file"}]
        """.utf8)
        let entries = GitHubContents.parse(json)
        // Folders first, then files alphabetical.
        #expect(entries.map(\.name) == ["docs", "app.swift", "README.md"])
        #expect(entries.first?.isDir == true)
    }

    @Test func badListingIsEmpty() {
        #expect(GitHubContents.parse(Data("not json".utf8)).isEmpty)
    }

    @Test func buildsRawURL() {
        let l = GitHubLink(owner: "o", repo: "r", ref: "main", path: "a b/c.md")
        #expect(GitHubLinkParser.rawURL(l)
            == "https://raw.githubusercontent.com/o/r/main/a%20b/c.md")
        // No ref or directory → no raw URL.
        #expect(GitHubLinkParser.rawURL(GitHubLink(owner: "o", repo: "r", isDirectory: true)) == nil)
    }
}
