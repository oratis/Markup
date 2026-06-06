import Testing
@testable import MarkupKit

@Suite("FileKind")
struct FileKindTests {
    @Test func classifies() {
        #expect(FileKind.of("Note.md") == .markdown)
        #expect(FileKind.of("a.markdown") == .markdown)
        #expect(FileKind.of("page.html") == .html)
        #expect(FileKind.of("page.HTM") == .html)
        #expect(FileKind.of("readme.txt") == .markdown)
        #expect(markupSupportedExtensions.contains("txt"))
        #expect(FileKind.of("photo.png") == nil)
    }

    @Test func supportedExtensions() {
        #expect(markupSupportedExtensions.contains("html"))
        #expect(markupSupportedExtensions.contains("md"))
    }

    @Test func detectsGeneratedRenderSiblings() {
        // `<doc>.html` next to a Markdown source → a generated sibling.
        #expect(markupIsGeneratedRenderSibling("notes.md.html"))
        #expect(markupIsGeneratedRenderSibling("README.MARKDOWN.HTML"))
        #expect(markupIsGeneratedRenderSibling("a.mdx.html"))
        #expect(markupIsGeneratedRenderSibling("b.mkd.html"))
        #expect(markupIsGeneratedRenderSibling("changelog.txt.html"))
        // Plain HTML docs and Markdown sources are not siblings.
        #expect(!markupIsGeneratedRenderSibling("page.html"))
        #expect(!markupIsGeneratedRenderSibling("index.htm"))
        #expect(!markupIsGeneratedRenderSibling("notes.md"))
        #expect(!markupIsGeneratedRenderSibling("photo.png"))
    }
}

@Suite("HTMLDoc")
struct HTMLDocTests {
    @Test func extractsTitle() {
        #expect(HTMLDoc.title("<html><head><title>My Page</title></head><body>x</body></html>") == "My Page")
        #expect(HTMLDoc.title("<title> Trimmed &amp; Entity </title>") == "Trimmed & Entity")
        #expect(HTMLDoc.title("<body>no title</body>") == nil)
    }

    @Test func plainTextStripsTagsScriptsStyles() {
        let html = """
        <html><head><style>.x{color:red}</style><title>T</title></head>
        <body><h1>Hello</h1><p>world &amp; more</p><script>alert(1)</script></body></html>
        """
        let text = HTMLDoc.plainText(html)
        #expect(text.contains("Hello"))
        #expect(text.contains("world & more"))
        #expect(!text.contains("alert"))
        #expect(!text.contains("color:red"))
        #expect(!text.contains("<"))
    }

    @Test func indexHTMLViaPlainTextIsSearchable() throws {
        let idx = try IndexService(path: ":memory:")
        let html = "<html><head><title>Recipe</title></head><body><p>flour and sugar</p></body></html>"
        try idx.index(relPath: "r.html", name: "r.html",
                      content: HTMLDoc.plainText(html), title: HTMLDoc.title(html))
        #expect(try idx.search("sugar").map(\.path) == ["r.html"])
        #expect(try idx.search("Recipe").first?.title == "Recipe")
    }
}
