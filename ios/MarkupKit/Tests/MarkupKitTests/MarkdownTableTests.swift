import Testing
@testable import MarkupKit

@Suite("MarkdownEdit.autoClose")
struct AutoCloseTests {
    @Test func partnersForKnownOpeners() {
        #expect(MarkdownEdit.autoClosePartner(for: "(") == ")")
        #expect(MarkdownEdit.autoClosePartner(for: "[") == "]")
        #expect(MarkdownEdit.autoClosePartner(for: "{") == "}")
        #expect(MarkdownEdit.autoClosePartner(for: "`") == "`")
        #expect(MarkdownEdit.autoClosePartner(for: "a") == nil)
    }

    @Test func insertsPairAndCentersCaret() {
        let e = MarkdownEdit.autoClose("ab", location: 1, open: "(")
        #expect(e == TextEdit(text: "a()b", location: 2, length: 0))
    }

    @Test func returnsNilForNonPair() {
        #expect(MarkdownEdit.autoClose("ab", location: 1, open: "x") == nil)
    }
}

@Suite("MarkdownEdit.wikilinkQuery")
struct WikilinkQueryTests {
    @Test func emptyRightAfterOpen() {
        // "[[" then caret → empty query (show all).
        #expect(MarkdownEdit.wikilinkQuery(in: "see [[", caret: 6) == "")
    }

    @Test func partialQuery() {
        #expect(MarkdownEdit.wikilinkQuery(in: "see [[road", caret: 10) == "road")
        // With autoclosed "]]" after the caret it still reads the partial.
        #expect(MarkdownEdit.wikilinkQuery(in: "see [[road]]", caret: 10) == "road")
    }

    @Test func nilWhenClosedOrNoOpen() {
        #expect(MarkdownEdit.wikilinkQuery(in: "see [[road]] x", caret: 14) == nil)
        #expect(MarkdownEdit.wikilinkQuery(in: "plain text", caret: 10) == nil)
    }

    @Test func nilAcrossNewlineOrSecondOpen() {
        #expect(MarkdownEdit.wikilinkQuery(in: "[[a\nb", caret: 5) == nil)
        #expect(MarkdownEdit.wikilinkQuery(in: "[[a[[b", caret: 6) == "b")
    }
}

@Suite("MarkdownTable.format")
struct MarkdownTableTests {
    @Test func detectsTable() {
        #expect(MarkdownTable.looksLikeTable("| a | b |\n| - | - |\n| 1 | 2 |"))
        #expect(!MarkdownTable.looksLikeTable("not a table"))
        #expect(!MarkdownTable.looksLikeTable("| a | b |\njust text"))
    }

    @Test func padsColumnsToWidest() {
        let input = "| Name | Lang |\n|-|-|\n| Markup | Swift |"
        let out = MarkdownTable.format(input)
        let expected = """
        | Name   | Lang  |
        | ------ | ----- |
        | Markup | Swift |
        """
        #expect(out == expected)
    }

    @Test func preservesAlignmentMarkers() {
        let input = "| a | b |\n| :-- | --: |\n| 1 | 2 |"
        let out = MarkdownTable.format(input)
        #expect(out.contains(":--"))
        #expect(out.contains("--:"))
    }

    @Test func fillsRaggedRows() {
        let input = "| a | b | c |\n| - | - | - |\n| 1 |"
        let out = MarkdownTable.format(input)
        // The short body row gets padded out to three columns.
        let lastLine = out.split(separator: "\n").last.map(String.init) ?? ""
        #expect(lastLine.filter { $0 == "|" }.count == 4)
    }

    @Test func leavesNonTableUnchanged() {
        #expect(MarkdownTable.format("hello\nworld") == "hello\nworld")
    }

    @Test func keepsTrailingNewline() {
        let input = "| a | b |\n| - | - |\n| 1 | 2 |\n"
        #expect(MarkdownTable.format(input).hasSuffix("|\n"))
    }
}
