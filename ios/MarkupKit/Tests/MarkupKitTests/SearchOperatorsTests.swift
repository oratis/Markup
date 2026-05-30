import Testing
@testable import MarkupKit

// Mirrors the documented behaviour of src/lib/search-operators.ts.
@Suite("parseQuery")
struct ParseQueryTests {
    @Test func emptyQuery() {
        #expect(parseQuery("") == ParsedQuery(tags: [], paths: [], text: ""))
    }

    @Test func plainTextOnly() {
        #expect(parseQuery("hello world") == ParsedQuery(tags: [], paths: [], text: "hello world"))
    }

    @Test func parsesTagOperatorStrippingHash() {
        #expect(parseQuery("tag:#foo") == ParsedQuery(tags: ["foo"], paths: [], text: ""))
        #expect(parseQuery("tag:foo") == ParsedQuery(tags: ["foo"], paths: [], text: ""))
    }

    @Test func parsesNestedTag() {
        #expect(parseQuery("tag:projects/markup")
            == ParsedQuery(tags: ["projects/markup"], paths: [], text: ""))
    }

    @Test func parsesPathOperator() {
        #expect(parseQuery("path:journal/") == ParsedQuery(tags: [], paths: ["journal/"], text: ""))
    }

    @Test func mixesOperatorsAndFreeText() {
        let parsed = parseQuery("foo tag:bar path:notes/ baz")
        #expect(parsed.tags == ["bar"])
        #expect(parsed.paths == ["notes/"])
        #expect(parsed.text == "foo baz")
    }

    @Test func operatorKeywordsAreCaseInsensitive() {
        #expect(parseQuery("TAG:foo") == ParsedQuery(tags: ["foo"], paths: [], text: ""))
        #expect(parseQuery("Path:x") == ParsedQuery(tags: [], paths: ["x"], text: ""))
    }
}

@Suite("pathMatches")
struct PathMatchesTests {
    @Test func trueWhenNoOperators() {
        #expect(pathMatches("anything/here.md", []))
    }

    @Test func caseInsensitiveSubstring() {
        #expect(pathMatches("Notes/API.md", ["api"]))
        #expect(pathMatches("Notes/API.md", ["notes"]))
    }

    @Test func requiresEveryOperator() {
        #expect(pathMatches("journal/2026/today.md", ["journal", "2026"]))
        #expect(!pathMatches("journal/today.md", ["journal", "2026"]))
    }
}
