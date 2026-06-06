import Testing
@testable import MarkupKit

@Suite("GitHubZipball")
struct GitHubZipballTests {
    private let entries = [
        "Genymobile-scrcpy-a1b2c3d/",
        "Genymobile-scrcpy-a1b2c3d/README.md",
        "Genymobile-scrcpy-a1b2c3d/doc/",
        "Genymobile-scrcpy-a1b2c3d/doc/build.md",
        "Genymobile-scrcpy-a1b2c3d/assets/logo.png",
    ]

    @Test func findsCommonTopLevelDir() {
        #expect(GitHubZipball.topLevelDir(entries) == "Genymobile-scrcpy-a1b2c3d")
    }

    @Test func noTopLevelWhenSegmentsDiffer() {
        #expect(GitHubZipball.topLevelDir(["a/x.md", "b/y.md"]) == nil)
    }

    @Test func topLevelIgnoresEmptyPaths() {
        #expect(GitHubZipball.topLevelDir(["", "root/a.md", "root/b.md"]) == "root")
    }

    @Test func emptyInputHasNoTopLevel() {
        #expect(GitHubZipball.topLevelDir([]) == nil)
    }

    @Test func stripsTopLevelToVaultRelativePaths() {
        let top = "Genymobile-scrcpy-a1b2c3d"
        #expect(GitHubZipball.vaultPath("\(top)/README.md", topLevel: top) == "README.md")
        #expect(GitHubZipball.vaultPath("\(top)/doc/build.md", topLevel: top) == "doc/build.md")
        #expect(GitHubZipball.vaultPath("\(top)/assets/logo.png", topLevel: top) == "assets/logo.png")
    }

    @Test func dropsTheTopDirAndPureDirectoryEntries() {
        let top = "root"
        #expect(GitHubZipball.vaultPath("root/", topLevel: top) == nil)
        #expect(GitHubZipball.vaultPath("root", topLevel: top) == nil)
        #expect(GitHubZipball.vaultPath("root/doc/", topLevel: top) == nil)
    }

    @Test func dropsEntriesOutsideTheTopDir() {
        #expect(GitHubZipball.vaultPath("other/x.md", topLevel: "root") == nil)
    }

    @Test func fullStripPipelineOverEntries() {
        let top = GitHubZipball.topLevelDir(entries)!
        let rels = entries.compactMap { GitHubZipball.vaultPath($0, topLevel: top) }
        #expect(rels == ["README.md", "doc/build.md", "assets/logo.png"])
    }
}
