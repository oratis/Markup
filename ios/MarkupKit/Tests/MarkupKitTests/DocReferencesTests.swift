import Testing
@testable import MarkupKit

@Suite("DocReferences.classify")
struct DocReferencesClassifyTests {
    @Test func anchorsStayInDocument() {
        #expect(DocReferences.classify("#install", in: "docs/g.md") == .anchor("#install"))
        #expect(DocReferences.classify("  #top ", in: "g.md") == .anchor("#top"))
    }

    @Test func externalSchemesAndProtocolRelative() {
        #expect(DocReferences.classify("https://x.com/a", in: "g.md") == .external("https://x.com/a"))
        #expect(DocReferences.classify("http://x.com", in: "g.md") == .external("http://x.com"))
        #expect(DocReferences.classify("HTTPS://X.com", in: "g.md") == .external("HTTPS://X.com"))
        #expect(DocReferences.classify("mailto:a@b.com", in: "g.md") == .external("mailto:a@b.com"))
        #expect(DocReferences.classify("tel:+1555", in: "g.md") == .external("tel:+1555"))
        #expect(DocReferences.classify("data:image/png;base64,AA", in: "g.md")
            == .external("data:image/png;base64,AA"))
        #expect(DocReferences.classify("//cdn.example.com/x.js", in: "g.md")
            == .external("//cdn.example.com/x.js"))
    }

    @Test func relativeResolvesAgainstDocDirectory() {
        #expect(DocReferences.classify("img.png", in: "docs/guide.md") == .inRepo("docs/img.png"))
        #expect(DocReferences.classify("./img.png", in: "docs/guide.md") == .inRepo("docs/img.png"))
        #expect(DocReferences.classify("../api/x.md", in: "docs/guide.md") == .inRepo("api/x.md"))
        #expect(DocReferences.classify("sub/x.md", in: "docs/guide.md") == .inRepo("docs/sub/x.md"))
    }

    @Test func leadingSlashIsRepoRootRelative() {
        #expect(DocReferences.classify("/README.md", in: "docs/deep/g.md") == .inRepo("README.md"))
        #expect(DocReferences.classify("/assets/x.png", in: "g.md") == .inRepo("assets/x.png"))
    }

    @Test func escapingTheRepoRootIsUnresolvable() {
        #expect(DocReferences.classify("../../etc/passwd", in: "a/b.md") == .unresolvable("../../etc/passwd"))
        #expect(DocReferences.classify("../x.md", in: "g.md") == .unresolvable("../x.md"))
    }

    @Test func queryAndFragmentAreStrippedBeforeResolving() {
        #expect(DocReferences.classify("x.md#section", in: "docs/g.md") == .inRepo("docs/x.md"))
        #expect(DocReferences.classify("x.md?raw=1", in: "docs/g.md") == .inRepo("docs/x.md"))
        #expect(DocReferences.classify("../api.md?v=2#h", in: "docs/g.md") == .inRepo("api.md"))
    }

    @Test func percentEncodingIsDecoded() {
        #expect(DocReferences.classify("my%20file.md", in: "docs/g.md") == .inRepo("docs/my file.md"))
    }

    @Test func emptyIsUnresolvable() {
        #expect(DocReferences.classify("", in: "g.md") == .unresolvable(""))
        #expect(DocReferences.classify("   ", in: "g.md") == .unresolvable("   "))
    }
}

@Suite("DocReferences.markdown")
struct DocReferencesMarkdownTests {
    @Test func extractsImagesAndLinks() {
        let md = """
        # Title
        ![diagram](./img/arch.png)
        See [the API](../api/reference.md) and [the site](https://example.com).
        """
        let refs = DocReferences.markdown(md, docPath: "docs/guide.md")
        #expect(refs.contains(DocRef(raw: "./img/arch.png", kind: .image, target: .inRepo("docs/img/arch.png"))))
        #expect(refs.contains(DocRef(raw: "../api/reference.md", kind: .link, target: .inRepo("api/reference.md"))))
        #expect(refs.contains(DocRef(raw: "https://example.com", kind: .link, target: .external("https://example.com"))))
    }

    @Test func ignoresUrlsInsideCode() {
        let md = """
        Inline `[not a link](nope.md)` stays code.

        ```
        ![also not](skip.png)
        [nor this](skip.md)
        ```

        But [this one](real.md) counts.
        """
        let refs = DocReferences.markdown(md, docPath: "g.md")
        let raws = refs.map(\.raw)
        #expect(raws.contains("real.md"))
        #expect(!raws.contains("nope.md"))
        #expect(!raws.contains("skip.png"))
        #expect(!raws.contains("skip.md"))
    }

    @Test func handlesAngleBracketUrls() {
        let refs = DocReferences.markdown("[a](<my file.md>)", docPath: "docs/g.md")
        #expect(refs.contains(DocRef(raw: "my file.md", kind: .link, target: .inRepo("docs/my file.md"))))
    }

    @Test func findsRawHtmlImgInsideMarkdown() {
        let refs = DocReferences.markdown("<img src=\"pic.png\"> text", docPath: "g.md")
        #expect(refs.contains(DocRef(raw: "pic.png", kind: .image, target: .inRepo("pic.png"))))
    }
}

@Suite("DocReferences.html")
struct DocReferencesHTMLTests {
    @Test func extractsImgScriptStylesheetAndAnchor() {
        let html = """
        <link rel="stylesheet" href="style.css">
        <script src="app.js"></script>
        <img src="logo.png">
        <a href="https://x.com">x</a>
        <a href="../page.md">page</a>
        """
        let refs = DocReferences.html(html, docPath: "site/index.html")
        #expect(refs.contains(DocRef(raw: "style.css", kind: .stylesheet, target: .inRepo("site/style.css"))))
        #expect(refs.contains(DocRef(raw: "app.js", kind: .script, target: .inRepo("site/app.js"))))
        #expect(refs.contains(DocRef(raw: "logo.png", kind: .image, target: .inRepo("site/logo.png"))))
        #expect(refs.contains(DocRef(raw: "https://x.com", kind: .link, target: .external("https://x.com"))))
        #expect(refs.contains(DocRef(raw: "../page.md", kind: .link, target: .inRepo("page.md"))))
    }

    @Test func attributesAreCaseInsensitiveAndQuoteAgnostic() {
        let refs = DocReferences.html("<IMG SRC='a.png'><Img src=\"b.png\">", docPath: "g.html")
        let imgs = refs.filter { $0.kind == .image }.map(\.raw).sorted()
        #expect(imgs == ["a.png", "b.png"])
    }
}
