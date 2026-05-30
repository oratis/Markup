import Testing
@testable import MarkupKit

@Suite("MarkdownEdit.wrap")
struct WrapTests {
    @Test func emptySelectionPlacesCaretBetween() {
        let e = MarkdownEdit.wrap("ab", location: 1, length: 0, open: "**", close: "**")
        #expect(e.text == "a****b")
        #expect(e.location == 3)
        #expect(e.length == 0)
    }

    @Test func wrapsSelection() {
        let e = MarkdownEdit.wrap("abc", location: 0, length: 3, open: "**", close: "**")
        #expect(e.text == "**abc**")
        #expect(e.location == 2)
        #expect(e.length == 3)
    }
}

@Suite("MarkdownEdit.insert")
struct InsertTests {
    @Test func insertsAtCaret() {
        let e = MarkdownEdit.insert("ab", location: 2, length: 0, snippet: "X")
        #expect(e.text == "abX")
        #expect(e.location == 3)
    }

    @Test func caretOffsetParksInsideSnippet() {
        let e = MarkdownEdit.insert("", location: 0, length: 0, snippet: "[]()", caretOffset: 1)
        #expect(e.text == "[]()")
        #expect(e.location == 1)
    }
}

@Suite("MarkdownEdit.toggleLinePrefix")
struct ToggleLinePrefixTests {
    @Test func addsPrefix() {
        let e = MarkdownEdit.toggleLinePrefix("hello", location: 2, prefix: "# ")
        #expect(e.text == "# hello")
    }

    @Test func removesPrefix() {
        let e = MarkdownEdit.toggleLinePrefix("# hello", location: 4, prefix: "# ")
        #expect(e.text == "hello")
    }

    @Test func togglesOnlyTheCurrentLine() {
        let e = MarkdownEdit.toggleLinePrefix("a\nb\nc", location: 2, prefix: "> ")
        #expect(e.text == "a\n> b\nc")
    }
}

@Suite("MarkdownEdit.listContinuation")
struct ListContinuationTests {
    @Test func bullet() {
        #expect(MarkdownEdit.listContinuation(forLine: "- item") == .next("- "))
        #expect(MarkdownEdit.listContinuation(forLine: "  * item") == .next("  * "))
    }

    @Test func numbered() {
        #expect(MarkdownEdit.listContinuation(forLine: "1. item") == .next("2. "))
        #expect(MarkdownEdit.listContinuation(forLine: "3) item") == .next("4) "))
    }

    @Test func task() {
        #expect(MarkdownEdit.listContinuation(forLine: "- [x] done") == .next("- [ ] "))
    }

    @Test func emptyItemExits() {
        #expect(MarkdownEdit.listContinuation(forLine: "- ") == .exit)
        #expect(MarkdownEdit.listContinuation(forLine: "1. ") == .exit)
    }

    @Test func nonListIsNone() {
        #expect(MarkdownEdit.listContinuation(forLine: "plain text") == .none)
    }
}
