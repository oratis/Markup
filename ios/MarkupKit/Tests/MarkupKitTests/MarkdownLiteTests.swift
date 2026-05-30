import Testing
@testable import MarkupKit

@Suite("MarkdownLite.renderBody")
struct MarkdownLiteTests {
    @Test func headings() {
        #expect(MarkdownLite.renderBody("# Title").contains("<h1>Title</h1>"))
        #expect(MarkdownLite.renderBody("### Deep").contains("<h3>Deep</h3>"))
    }

    @Test func paragraph() {
        #expect(MarkdownLite.renderBody("hello world").contains("<p>hello world</p>"))
    }

    @Test func joinsParagraphLines() {
        let html = MarkdownLite.renderBody("one\ntwo")
        #expect(html.contains("<p>one two</p>"))
    }

    @Test func escapesHTML() {
        let html = MarkdownLite.renderBody("a <script>alert(1)</script> & b")
        #expect(html.contains("&lt;script&gt;"))
        #expect(html.contains("&amp;"))
        #expect(!html.contains("<script>"))
    }

    @Test func inlineBoldItalicCode() {
        let html = MarkdownLite.renderBody("a **b** c *d* `e`")
        #expect(html.contains("<strong>b</strong>"))
        #expect(html.contains("<em>d</em>"))
        #expect(html.contains("<code>e</code>"))
    }

    @Test func codeSpanKeepsAsterisksLiteral() {
        let html = MarkdownLite.renderBody("`a*b*c`")
        #expect(html.contains("<code>a*b*c</code>"))
        #expect(!html.contains("<em>"))
    }

    @Test func link() {
        let html = MarkdownLite.renderBody("see [docs](https://x.test/y)")
        #expect(html.contains("<a href=\"https://x.test/y\">docs</a>"))
    }

    @Test func fencedCodeEscapesAndLabels() {
        let html = MarkdownLite.renderBody("```swift\nlet x = a < b\n```")
        #expect(html.contains("<pre><code class=\"language-swift\">"))
        #expect(html.contains("let x = a &lt; b"))
    }

    @Test func unorderedList() {
        let html = MarkdownLite.renderBody("- one\n- two")
        #expect(html.contains("<ul>"))
        #expect(html.contains("<li>one</li>"))
        #expect(html.contains("<li>two</li>"))
    }

    @Test func orderedList() {
        let html = MarkdownLite.renderBody("1. a\n2. b")
        #expect(html.contains("<ol>"))
        #expect(html.contains("<li>a</li>"))
    }

    @Test func documentWrapsWithThemeAndTitle() {
        let doc = MarkdownLite.renderDocument("# Hi", title: "My Note", theme: .dark)
        #expect(doc.contains("<!doctype html>"))
        #expect(doc.contains("<title>My Note</title>"))
        #expect(doc.contains("<h1>Hi</h1>"))
        #expect(doc.contains("#1c1c1e")) // dark background token
    }
}
