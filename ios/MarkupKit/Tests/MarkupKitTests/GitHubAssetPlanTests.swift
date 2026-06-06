import Testing
@testable import MarkupKit

@Suite("GitHubAssetPlan")
struct GitHubAssetPlanTests {
    @Test func markdownKeepsOnlyInRepoImages() {
        let md = """
        # Title
        ![arch](./img/arch.png)
        ![logo](../assets/logo.svg)
        ![remote](https://cdn.example.com/x.png)
        See [the API](../api/reference.md) and [site](https://example.com).
        """
        let plan = GitHubAssetPlan.markdown(md, docPath: "docs/guide.md")
        #expect(plan.docPath == "docs/guide.md")
        // Images resolved in-repo; external image, the doc link, and external
        // link are all excluded.
        #expect(plan.assetPaths == ["docs/img/arch.png", "assets/logo.svg"])
    }

    @Test func htmlKeepsImageScriptStylesheetNotAnchors() {
        let html = """
        <link rel="stylesheet" href="style.css">
        <script src="app.js"></script>
        <img src="logo.png">
        <a href="page.html">page</a>
        <a href="https://x.com">x</a>
        <img src="https://cdn/x.png">
        """
        let plan = GitHubAssetPlan.html(html, docPath: "site/index.html")
        // img → script → stylesheet (DocReferences' scan order); <a> links and
        // the external image are excluded.
        #expect(plan.assetPaths == ["site/logo.png", "site/app.js", "site/style.css"])
    }

    @Test func deduplicatesRepeatedAssetsPreservingFirstOrder() {
        let md = """
        ![a](x.png)
        ![b](x.png)
        ![c](y.png)
        ![d](x.png)
        """
        let plan = GitHubAssetPlan.markdown(md, docPath: "g.md")
        #expect(plan.assetPaths == ["x.png", "y.png"])
    }

    @Test func excludesUnresolvableAndAnchors() {
        let md = "![esc](../../etc/passwd) ![ok](pic.png) [a](#section)"
        let plan = GitHubAssetPlan.markdown(md, docPath: "a/b.md")
        #expect(plan.assetPaths == ["a/pic.png"])
    }

    @Test func emptyWhenNoAssets() {
        let plan = GitHubAssetPlan.markdown("# Just text, [a link](other.md).", docPath: "g.md")
        #expect(plan.assetPaths.isEmpty)
    }
}
