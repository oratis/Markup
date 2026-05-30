import Foundation
import Testing
@testable import MarkupKit

@Suite("parseHeadings")
struct HeadingsTests {
    @Test func atxHeadings() {
        let h = parseHeadings("# A\n\n## B\ntext\n### C")
        #expect(h == [
            Heading(level: 1, text: "A", line: 0),
            Heading(level: 2, text: "B", line: 2),
            Heading(level: 3, text: "C", line: 4),
        ])
    }

    @Test func trimsTrailingHashes() {
        #expect(parseHeadings("## Title ##").first?.text == "Title")
    }

    @Test func skipsHeadingsInFences() {
        let h = parseHeadings("# Real\n```\n# not a heading\n```\n## Also real")
        #expect(h.map(\.text) == ["Real", "Also real"])
    }

    @Test func setextHeadings() {
        let h = parseHeadings("Title\n=====\n\nSub\n---")
        #expect(h == [
            Heading(level: 1, text: "Title", line: 0),
            Heading(level: 2, text: "Sub", line: 3),
        ])
    }

    @Test func breadcrumb() {
        let h = parseHeadings("# A\n## B\n### C\ncursor")
        let crumb = headingBreadcrumb(h, cursorLine: 3)
        #expect(crumb.map(\.text) == ["A", "B", "C"])
    }
}

@Suite("parseWikilinks / findVaultFile")
struct WikilinkTests {
    @Test func parsesPlainLink() {
        let w = parseWikilinks("see [[Note A]] please")
        #expect(w.count == 1)
        #expect(w[0].target == "Note A")
        #expect(w[0].heading == nil)
        #expect(w[0].isEmbed == false)
    }

    @Test func parsesHeadingAndLabelAndEmbed() {
        let w = parseWikilinks("![[Doc#Section|alias]]")
        #expect(w[0].target == "Doc")
        #expect(w[0].heading == "Section")
        #expect(w[0].label == "alias")
        #expect(w[0].isEmbed == true)
    }

    @Test func multipleLinks() {
        let w = parseWikilinks("[[a]] and [[b#h]]")
        #expect(w.map(\.target) == ["a", "b"])
        #expect(w[1].heading == "h")
    }

    private func files() -> [VaultFile] {
        ["Notes/Alpha.md", "beta.md", "Gamma.markdown"].map {
            VaultFile(path: "/v/\($0)", relPath: $0, name: ($0 as NSString).lastPathComponent, mtimeMs: 0, size: 0)
        }
    }

    @Test func resolvesByBasenameWithAndWithoutExt() {
        #expect(findVaultFile(files(), name: "Alpha.md")?.name == "Alpha.md")
        #expect(findVaultFile(files(), name: "Alpha")?.name == "Alpha.md")
        #expect(findVaultFile(files(), name: "beta")?.name == "beta.md")
    }

    @Test func resolvesCaseInsensitively() {
        #expect(findVaultFile(files(), name: "alpha")?.name == "Alpha.md")
        #expect(findVaultFile(files(), name: "GAMMA")?.name == "Gamma.markdown")
    }

    @Test func unresolvedIsNil() {
        #expect(findVaultFile(files(), name: "missing") == nil)
    }
}

@Suite("extractTags")
struct TagExtractTests {
    @Test func inlineBodyTagsIncludingNested() {
        let tags = extractTags("intro #foo and #projects/markup here")
        #expect(tags.contains("foo"))
        #expect(tags.contains("projects/markup"))
    }

    @Test func ignoresHeadingMarkerButKeepsTrailingTag() {
        let tags = extractTags("## Section #review")
        #expect(tags == ["review"])
    }

    @Test func ignoresFencedAndInlineCodeAndNumeric() {
        let tags = extractTags("```\n#pragma once\n```\nuse `#define` and #1 but #real")
        #expect(tags == ["real"])
    }

    @Test func frontmatterInlineAndBlock() {
        let inline = extractTags("---\ntags: [a, b]\n---\nbody")
        #expect(inline == ["a", "b"])
        let block = extractTags("---\ntags:\n  - x\n  - \"y z\"\n---\nbody #z")
        #expect(block.isSuperset(of: ["x", "y z", "z"]))
    }

    @Test func ancestors() {
        #expect(tagAncestors("a/b/c") == ["a", "a/b", "a/b/c"])
    }
}

@Suite("text stats")
struct TextStatsTests {
    @Test func countsWordsAndCJK() {
        #expect(countWords("hello world") == 2)
        #expect(countWords("  ") == 0)
        #expect(countWords("中文 test") == 3) // 中, 文, "test"
    }

    @Test func byteAndHumanSize() {
        #expect(byteSize("abc") == 3)
        #expect(byteSize("中") == 3)
        #expect(humanSize(512) == "512 B")
        #expect(humanSize(2048) == "2.0 KB")
        #expect(humanSize(5 * 1024 * 1024) == "5.0 MB")
    }
}
