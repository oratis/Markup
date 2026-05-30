import Testing
@testable import MarkupKit

@Suite("ReaderHTML.needs detection")
struct ReaderHTMLDetectionTests {
    @Test func detectsDisplayAndInlineMath() {
        #expect(ReaderHTML.needsMath("$$x^2$$"))
        #expect(ReaderHTML.needsMath("an $x = y$ inline"))
    }

    @Test func ignoresStrayDollarsInProse() {
        #expect(!ReaderHTML.needsMath("it costs $5 and $10 today"))
        #expect(!ReaderHTML.needsMath("no math here"))
    }

    @Test func detectsMermaidFence() {
        #expect(ReaderHTML.needsMermaid("```mermaid\ngraph TD;A-->B\n```"))
        #expect(!ReaderHTML.needsMermaid("```swift\nlet x = 1\n```"))
    }
}

@Suite("ReaderHTML.document")
struct ReaderHTMLDocumentTests {
    @Test func wrapsWithTitleAndAlwaysLoadsMarked() {
        let doc = ReaderHTML.document(markdown: "# Hi", title: "My Note", theme: .light)
        #expect(doc.contains("<!doctype html>"))
        #expect(doc.contains("<title>My Note</title>"))
        #expect(doc.contains("marked@\(ReaderHTML.markedVersion)"))
        #expect(doc.contains("highlight.min.js"))
        #expect(doc.contains("id=\"content\""))
    }

    @Test func embedsMarkdownAsJSStringNotRawHTML() {
        let doc = ReaderHTML.document(markdown: "hello world", title: "T", theme: .light)
        #expect(doc.contains("\"hello world\""))
    }

    @Test func loadsKaTeXOnlyWhenMathPresent() {
        let withMath = ReaderHTML.document(markdown: "$a+b$", title: "T", theme: .light)
        let without = ReaderHTML.document(markdown: "plain text", title: "T", theme: .light)
        #expect(withMath.contains("katex@\(ReaderHTML.katexVersion)"))
        #expect(!without.contains("katex@"))
    }

    @Test func loadsMermaidOnlyWhenDiagramPresent() {
        let withDiagram = ReaderHTML.document(
            markdown: "```mermaid\ngraph TD;A-->B\n```", title: "T", theme: .light)
        let without = ReaderHTML.document(markdown: "no diagram", title: "T", theme: .light)
        #expect(withDiagram.contains("mermaid@\(ReaderHTML.mermaidVersion)"))
        #expect(!without.contains("mermaid@"))
    }

    @Test func neutralizesScriptInjectionInMarkdown() {
        let doc = ReaderHTML.document(
            markdown: "</script><img src=x onerror=alert(1)>", title: "T", theme: .light)
        // The embedded markdown must not contain a raw closing tag that breaks out.
        #expect(doc.contains("<\\/script>"))
    }

    @Test func darkThemeUsesDarkTokensAndHljsTheme() {
        let doc = ReaderHTML.document(markdown: "# Hi", title: "T", theme: .dark)
        #expect(doc.contains("#1c1c1e"))          // dark background token
        #expect(doc.contains("github-dark.min.css"))
    }
}
