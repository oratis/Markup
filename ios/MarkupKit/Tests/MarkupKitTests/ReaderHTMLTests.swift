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

@Suite("ReaderHTML.githubSlug")
struct ReaderHTMLSlugTests {
    @Test func slugsPlainHeadings() {
        #expect(ReaderHTML.githubSlug("Getting Started") == "getting-started")
        #expect(ReaderHTML.githubSlug("API Reference") == "api-reference")
    }

    @Test func dropsPunctuationWithoutSpuriousWordBreaks() {
        #expect(ReaderHTML.githubSlug("POST /users") == "post-users")
        #expect(ReaderHTML.githubSlug("Hello, World!") == "hello-world")
        #expect(ReaderHTML.githubSlug("C++ Guide") == "c-guide")
        #expect(ReaderHTML.githubSlug("Section: Overview") == "section-overview")
    }

    @Test func keepsHyphensAndUnderscores() {
        #expect(ReaderHTML.githubSlug("snake_case and kebab-case") == "snake_case-and-kebab-case")
    }

    @Test func emptyForPunctuationOnlyHeading() {
        #expect(ReaderHTML.githubSlug("!!!") == "")
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

    @Test func appliesCustomLineHeight() {
        let doc = ReaderHTML.document(markdown: "hi", title: "T", lineHeight: 2.0)
        #expect(doc.contains("line-height: 2.00"))
        // Clamped to a sane range.
        let clamped = ReaderHTML.document(markdown: "hi", title: "T", lineHeight: 9.0)
        #expect(clamped.contains("line-height: 2.40"))
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

    @Test func assetBaseUsesBundledOfflineURLsNotCDN() {
        let doc = ReaderHTML.document(
            markdown: "$x$\n```mermaid\ngraph TD;A-->B\n```", title: "T", theme: .light,
            assetBase: "markupasset:///")
        #expect(doc.contains("markupasset:///marked.umd.js"))
        #expect(doc.contains("markupasset:///highlight/highlight.min.js"))
        #expect(doc.contains("markupasset:///katex/katex.min.css"))
        #expect(doc.contains("markupasset:///mermaid.min.js"))
        #expect(!doc.contains("jsdelivr"))
    }

    @Test func defaultStillUsesCDN() {
        let doc = ReaderHTML.document(markdown: "# Hi", title: "T", theme: .light)
        #expect(doc.contains("jsdelivr"))
    }

    @Test func exposesLivePreviewRenderHook() {
        let doc = ReaderHTML.document(markdown: "# Hi", title: "T", theme: .light)
        // The render pipeline is callable for incremental live-preview updates.
        #expect(doc.contains("window.__markupSetMarkdown"))
        #expect(doc.contains("function mkRender("))
        // Still parses on initial load + keeps the task-list bridge.
        #expect(doc.contains("mkRender("))
        #expect(doc.contains("messageHandlers.task"))
    }

    @Test func javaScriptStringLiteralEscapesScriptBreakout() {
        let lit = ReaderHTML.javaScriptStringLiteral("</script><b>")
        #expect(lit.contains("<\\/script>"))
        #expect(lit.hasPrefix("\""))
    }

    @Test func injectsSlugToHeadingIdMapAndScrollHook() {
        let md = "# POST /users\n\nbody\n\n## Notes & Caveats\n"
        let doc = ReaderHTML.document(markdown: md, title: "T", theme: .light)
        // The fragment-resolution hook the native handler / TOC clicks call.
        #expect(doc.contains("window.__markupScrollToSlug"))
        // Headings get mk-h{index} ids keyed by their GitHub-style slug, in order.
        #expect(doc.contains("var MK_SLUGS ="))
        #expect(doc.contains("\"post-users\":\"mk-h0\""))
        #expect(doc.contains("\"notes-caveats\":\"mk-h1\""))
    }

    @Test func deduplicatesRepeatedSlugsLikeGitHub() {
        let md = "# Intro\n\n## Intro\n\n## Intro\n"
        let doc = ReaderHTML.document(markdown: md, title: "T", theme: .light)
        #expect(doc.contains("\"intro\":\"mk-h0\""))
        #expect(doc.contains("\"intro-1\":\"mk-h1\""))
        #expect(doc.contains("\"intro-2\":\"mk-h2\""))
    }

    @Test func embedsCalloutTransformAndStyles() {
        let doc = ReaderHTML.document(markdown: "> [!NOTE]\n> Hi", title: "T", theme: .light)
        // The DOM transform + the injected title map for every known type.
        #expect(doc.contains("markdown-alert markdown-alert-"))
        #expect(doc.contains("markdown-alert-title"))
        for (type, title) in Callout.titles {
            #expect(doc.contains("\(type):\"\(title)\""))
        }
        // And the matching CSS.
        #expect(doc.contains(".markdown-alert-warning"))
    }
}
