import Testing
@testable import MarkupKit

@Suite("CanvasInfo")
struct CanvasInfoTests {
    @Test func countsNodesAndEdges() {
        let json = """
        {"nodes":[{"id":"a"},{"id":"b"},{"id":"c"}],"edges":[{"id":"e1"}]}
        """
        let c = CanvasInfo.counts(fromJSON: json)
        #expect(c == CanvasInfo.Counts(nodes: 3, edges: 1))
    }

    @Test func missingArraysAreZero() {
        #expect(CanvasInfo.counts(fromJSON: "{}") == CanvasInfo.Counts(nodes: 0, edges: 0))
    }

    @Test func malformedJSONIsZero() {
        #expect(CanvasInfo.counts(fromJSON: "not json") == CanvasInfo.Counts(nodes: 0, edges: 0))
    }

    @Test func canvasIsListableNotIndexable() {
        #expect(FileKind.of("board.canvas") == .canvas)
        #expect(markupListableExtensions.contains("canvas"))
        #expect(!markupSupportedExtensions.contains("canvas"))
    }
}
