import Testing
@testable import MarkupKit

@Suite("FileKind")
struct FileKindTests {
    @Test func classifies() {
        #expect(FileKind.of("Note.md") == .markdown)
        #expect(FileKind.of("a.markdown") == .markdown)
        #expect(FileKind.of("page.html") == .html)
        #expect(FileKind.of("page.HTM") == .html)
        #expect(FileKind.of("photo.png") == nil)
    }

    @Test func supportedExtensions() {
        #expect(markupSupportedExtensions.contains("html"))
        #expect(markupSupportedExtensions.contains("md"))
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
