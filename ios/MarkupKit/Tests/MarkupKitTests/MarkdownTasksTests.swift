import Testing
@testable import MarkupKit

@Suite("MarkdownTasks")
struct MarkdownTasksTests {
    let doc = """
    # Todo
    - [ ] first
    - [x] second
    notes
    - [ ] third
    """

    @Test func countsTaskItems() {
        #expect(MarkdownTasks.count(doc) == 3)
        #expect(MarkdownTasks.count("no tasks here") == 0)
    }

    @Test func togglesUncheckedToChecked() {
        let out = MarkdownTasks.toggle(doc, at: 0)
        #expect(out?.contains("- [x] first") == true)
        #expect(out?.contains("- [x] second") == true) // unchanged
    }

    @Test func togglesCheckedToUnchecked() {
        let out = MarkdownTasks.toggle(doc, at: 1)
        #expect(out?.contains("- [ ] second") == true)
    }

    @Test func togglesByDocumentOrderAcrossNonTaskLines() {
        let out = MarkdownTasks.toggle(doc, at: 2)
        #expect(out?.contains("- [x] third") == true)
        #expect(out?.contains("- [ ] first") == true) // unchanged
    }

    @Test func outOfRangeReturnsNil() {
        #expect(MarkdownTasks.toggle(doc, at: 9) == nil)
        #expect(MarkdownTasks.toggle(doc, at: -1) == nil)
    }
}

@Suite("ScrollMemory")
struct ScrollMemoryTests {
    @Test func defaultsToZero() {
        #expect(ScrollMemory().position(for: "a.md") == 0)
    }

    @Test func setAndGetClamps() {
        var m = ScrollMemory()
        m.set(0.42, for: "a.md")
        #expect(m.position(for: "a.md") == 0.42)
        m.set(1.5, for: "b.md")
        #expect(m.position(for: "b.md") == 1.0)
    }

    @Test func zeroForgetsEntry() {
        var m = ScrollMemory(["a.md": 0.5])
        m.set(0, for: "a.md")
        #expect(m.storage["a.md"] == nil)
    }
}

@Suite("ReaderHTML font/width/restore")
struct ReaderHTMLControlsTests {
    @Test func fontScaleReflectedInCSS() {
        let doc = ReaderHTML.document(markdown: "# Hi", title: "T", theme: .light, fontScale: 1.25)
        #expect(doc.contains("font-size: 125%"))
    }

    @Test func maxWidthReflectedInCSS() {
        let doc = ReaderHTML.document(markdown: "# Hi", title: "T", theme: .light, maxWidth: 600)
        #expect(doc.contains("max-width: 600px"))
    }

    @Test func restoreFractionEmbedded() {
        let doc = ReaderHTML.document(markdown: "# Hi", title: "T", theme: .light, restoreFraction: 0.3)
        #expect(doc.contains("var restore = 0.3"))
    }

    @Test func taskAndScrollBridgesPresent() {
        let doc = ReaderHTML.document(markdown: "- [ ] x", title: "T", theme: .light)
        #expect(doc.contains("messageHandlers.task"))
        #expect(doc.contains("messageHandlers.scroll"))
    }
}
