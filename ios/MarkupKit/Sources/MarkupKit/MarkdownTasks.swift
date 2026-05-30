import Foundation

/// Pure helpers for GFM task-list checkboxes, so the reader can toggle a box and
/// write the change back to the file. Document order is 0-based and counts every
/// `- [ ]` / `- [x]` line (the same order the reader renders them).
public enum MarkdownTasks {

    private static let itemRegex = try! NSRegularExpression(
        pattern: "^(\\s*(?:[-*+]|\\d+\\.)\\s+\\[)([ xX])(\\].*)$")

    /// Number of task-list items in the document.
    public static func count(_ md: String) -> Int {
        var n = 0
        for line in md.components(separatedBy: "\n") where isTaskLine(line) { n += 1 }
        return n
    }

    /// Toggle the `index`-th task item between checked/unchecked. Returns the new
    /// markdown, or `nil` if `index` is out of range (so callers can no-op).
    public static func toggle(_ md: String, at index: Int) -> String? {
        guard index >= 0 else { return nil }
        var lines = md.components(separatedBy: "\n")
        var seen = -1
        for i in lines.indices {
            let line = lines[i]
            let ns = line as NSString
            guard let m = itemRegex.firstMatch(
                in: line, range: NSRange(location: 0, length: ns.length)) else { continue }
            seen += 1
            if seen == index {
                let mark = ns.substring(with: m.range(at: 2))
                let newMark = (mark == " ") ? "x" : " "
                lines[i] = ns.substring(with: m.range(at: 1)) + newMark + ns.substring(with: m.range(at: 3))
                return lines.joined(separator: "\n")
            }
        }
        return nil
    }

    private static func isTaskLine(_ line: String) -> Bool {
        let ns = line as NSString
        return itemRegex.firstMatch(in: line, range: NSRange(location: 0, length: ns.length)) != nil
    }
}
