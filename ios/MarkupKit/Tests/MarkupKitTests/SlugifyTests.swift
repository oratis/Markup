import Testing
@testable import MarkupKit

// Ported from src/lib/slugify.test.ts.
@Suite("slugifyForFilename")
struct SlugifyTests {
    @Test func stripsLeadingHashAndTrims() {
        #expect(slugifyForFilename("# Hello World ") == "Hello World")
        #expect(slugifyForFilename("###  Triple") == "Triple")
    }

    @Test func replacesUnsafeCharsWithDash() {
        #expect(slugifyForFilename("foo/bar:baz*qux?\"<>|") == "foo-bar-baz-qux-----")
    }

    @Test func capsLengthAtMax() {
        #expect(slugifyForFilename(String(repeating: "a", count: 200), max: 10).count == 10)
    }

    @Test func returnsEmptyForBlankInput() {
        #expect(slugifyForFilename("   ") == "")
    }
}

@Suite("firstHeadingText")
struct FirstHeadingTextTests {
    @Test func returnsFirstH1Content() {
        #expect(firstHeadingText("# Foo\nbody") == "Foo")
    }

    @Test func ignoresDeeperHeadings() {
        #expect(firstHeadingText("intro\n## Sub\n# Top\nbody") == "Top")
    }

    @Test func returnsNilWhenNoH1() {
        #expect(firstHeadingText("plain prose\nno hash") == nil)
    }

    @Test func ignoresHashWithoutFollowingSpace() {
        #expect(firstHeadingText("#foo bar") == nil)
    }
}
