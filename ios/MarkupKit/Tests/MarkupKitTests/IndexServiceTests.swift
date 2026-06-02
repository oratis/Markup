import Testing
@testable import MarkupKit

@Suite("IndexService")
struct IndexServiceTests {

    private func seeded() throws -> IndexService {
        let idx = try IndexService(path: ":memory:")
        try idx.index(relPath: "Projects/Markup.md", name: "Markup.md", content: """
        # Markup
        A fast markdown editor. #project/markup #rust
        See [[Roadmap]] and [[Notes#Ideas]].
        ## Goals
        ship it
        """)
        try idx.index(relPath: "Roadmap.md", name: "Roadmap.md", content: """
        # Roadmap
        milestones for the editor #project
        links back to [[Markup]]
        """)
        try idx.index(relPath: "journal/2026.md", name: "2026.md", content: """
        # Journal
        random thoughts about writing
        """)
        return idx
    }

    @Test func indexesAndCounts() throws {
        let idx = try seeded()
        #expect(try idx.documentCount() == 3)
    }

    @Test func fullTextSearchRanksMatches() throws {
        let idx = try seeded()
        let hits = try idx.search("editor")
        let paths = hits.map(\.path)
        #expect(paths.contains("Projects/Markup.md"))
        #expect(paths.contains("Roadmap.md"))
        #expect(!paths.contains("journal/2026.md"))
    }

    @Test func prefixSearchWorks() throws {
        let idx = try seeded()
        #expect(try idx.search("mark").map(\.path).contains("Projects/Markup.md"))
    }

    @Test func searchReturnsSnippetAroundMatch() throws {
        let idx = try seeded()
        let hit = try #require(try idx.search("editor").first { $0.path == "Projects/Markup.md" })
        // The matched term is wrapped in the «…» markers and the excerpt
        // carries surrounding context from the body.
        #expect(hit.snippet.contains("«editor»") || hit.snippet.localizedCaseInsensitiveContains("editor"))
        #expect(!hit.snippet.isEmpty)
    }

    @Test func recencyListingHasNoSnippet() throws {
        let idx = try seeded()
        // An operator-only query (no free text) lists by recency — no excerpt.
        let hits = try idx.search("tag:rust")
        #expect(hits.allSatisfy { $0.snippet.isEmpty })
    }

    @Test func tagOperatorFilters() throws {
        let idx = try seeded()
        let hits = try idx.search("tag:project")
        // Both project notes (exact + nested project/markup), not the journal.
        let paths = Set(hits.map(\.path))
        #expect(paths == ["Projects/Markup.md", "Roadmap.md"])
    }

    @Test func pathOperatorFilters() throws {
        let idx = try seeded()
        let hits = try idx.search("path:journal/")
        #expect(hits.map(\.path) == ["journal/2026.md"])
    }

    @Test func backlinksResolveByName() throws {
        let idx = try seeded()
        #expect(try idx.backlinks(toName: "Markup") == ["Roadmap.md"])
        #expect(try idx.backlinks(toName: "Roadmap.md") == ["Projects/Markup.md"])
    }

    @Test func outlineReturnsHeadings() throws {
        let idx = try seeded()
        let outline = try idx.outline(of: "Projects/Markup.md")
        #expect(outline.map(\.text) == ["Markup", "Goals"])
    }

    @Test func tagsAggregateWithCounts() throws {
        let idx = try seeded()
        let tags = try idx.allTags()
        #expect(tags.first(where: { $0.tag == "project" })?.count == 1)
        #expect(tags.contains(where: { $0.tag == "project/markup" }))
    }

    @Test func reindexReplacesRows() throws {
        let idx = try IndexService(path: ":memory:")
        try idx.index(relPath: "a.md", name: "a.md", content: "# One\napple")
        try idx.index(relPath: "a.md", name: "a.md", content: "# Two\nbanana")
        #expect(try idx.documentCount() == 1)
        #expect(try idx.search("banana").map(\.path) == ["a.md"])
        #expect(try idx.search("apple").isEmpty)
    }

    @Test func removeDeletesEverywhere() throws {
        let idx = try seeded()
        try idx.remove(relPath: "Roadmap.md")
        #expect(try idx.documentCount() == 2)
        #expect(try idx.backlinks(toName: "Markup").isEmpty)
    }
}
