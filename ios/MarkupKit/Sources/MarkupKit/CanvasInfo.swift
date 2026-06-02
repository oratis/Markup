import Foundation

/// Minimal inspection of an Obsidian `.canvas` file (a JSON document with
/// `nodes` and `edges` arrays). Used only to describe the file in the
/// "open on desktop" placeholder — the canvas is never rendered or modified
/// on iOS, preserving round-trip safety.
public enum CanvasInfo {
    public struct Counts: Equatable, Sendable {
        public var nodes: Int
        public var edges: Int
        public init(nodes: Int, edges: Int) {
            self.nodes = nodes
            self.edges = edges
        }
    }

    /// Count nodes and edges in canvas JSON. Returns zeros for anything that
    /// isn't a readable canvas document.
    public static func counts(fromJSON json: String) -> Counts {
        guard let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return Counts(nodes: 0, edges: 0) }
        let nodes = (obj["nodes"] as? [Any])?.count ?? 0
        let edges = (obj["edges"] as? [Any])?.count ?? 0
        return Counts(nodes: nodes, edges: edges)
    }
}
