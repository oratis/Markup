import Testing
@testable import MarkupKit

@Suite("TabList")
struct TabListTests {
    @Test func openingAppendsWhenAbsentAndIsIdempotent() {
        #expect(TabList.opening("a", into: []) == ["a"])
        #expect(TabList.opening("b", into: ["a"]) == ["a", "b"])
        // Already open → unchanged (re-activation is the caller's job).
        #expect(TabList.opening("a", into: ["a", "b"]) == ["a", "b"])
    }

    @Test func closingActivatesRightNeighbour() {
        #expect(TabList.neighborAfterClosing("a", in: ["a", "b", "c"]) == "b")
        #expect(TabList.neighborAfterClosing("b", in: ["a", "b", "c"]) == "c")
    }

    @Test func closingLastActivatesLeftNeighbour() {
        #expect(TabList.neighborAfterClosing("c", in: ["a", "b", "c"]) == "b")
    }

    @Test func closingOnlyTabActivatesNothing() {
        #expect(TabList.neighborAfterClosing("a", in: ["a"]) == nil)
    }

    @Test func closingUnknownReturnsNil() {
        #expect(TabList.neighborAfterClosing("z", in: ["a", "b"]) == nil)
    }
}
