import Foundation

/// Result of an edit: the new text plus the selection to set (UTF-16 offsets,
/// matching `UITextView`'s `selectedRange`).
public struct TextEdit: Equatable, Sendable {
    public var text: String
    public var location: Int
    public var length: Int
    public init(text: String, location: Int, length: Int) {
        self.text = text
        self.location = location
        self.length = length
    }
}

/// What pressing Return on a list line should do.
public enum ListContinuation: Equatable, Sendable {
    case none            // not a list line — default newline
    case exit            // empty item — clear the marker
    case next(String)    // insert newline + this prefix
}

/// Pure text-editing operations for the source editor, working on UTF-16
/// offsets so they map directly onto `UITextView`. Ports the intent of the
/// desktop CodeMirror helpers (`insert-md`, `cm-list-continue`).
public enum MarkdownEdit {

    /// Wrap the selection with `open`/`close`. Empty selection → caret between.
    public static func wrap(
        _ text: String, location: Int, length: Int, open: String, close: String
    ) -> TextEdit {
        let ns = text as NSString
        let range = NSRange(location: location, length: length)
        let inner = ns.substring(with: range)
        let newText = ns.replacingCharacters(in: range, with: open + inner + close)
        let openLen = (open as NSString).length
        return TextEdit(
            text: newText, location: location + openLen,
            length: length == 0 ? 0 : (inner as NSString).length)
    }

    /// Replace the selection with `snippet`; caret lands `caretOffset` UTF-16
    /// units past the insertion point (default: end of the snippet).
    public static func insert(
        _ text: String, location: Int, length: Int, snippet: String, caretOffset: Int? = nil
    ) -> TextEdit {
        let ns = text as NSString
        let range = NSRange(location: location, length: length)
        let newText = ns.replacingCharacters(in: range, with: snippet)
        return TextEdit(
            text: newText, location: location + (caretOffset ?? (snippet as NSString).length),
            length: 0)
    }

    /// Toggle a line `prefix` (e.g. "# ", "> ", "- ", "- [ ] ") on the line
    /// containing `location`.
    public static func toggleLinePrefix(_ text: String, location: Int, prefix: String) -> TextEdit {
        let ns = text as NSString
        let lineRange = ns.lineRange(for: NSRange(location: min(location, ns.length), length: 0))
        let line = ns.substring(with: lineRange)
        let hasNewline = line.hasSuffix("\n")
        let content = hasNewline ? String(line.dropLast()) : line
        let prefixLen = (prefix as NSString).length

        let newContent: String
        let delta: Int
        if content.hasPrefix(prefix) {
            newContent = String(content.dropFirst(prefix.count))
            delta = -prefixLen
        } else {
            newContent = prefix + content
            delta = prefixLen
        }
        let newLine = hasNewline ? newContent + "\n" : newContent
        let newText = ns.replacingCharacters(in: lineRange, with: newLine)
        return TextEdit(
            text: newText, location: max(lineRange.location, location + delta), length: 0)
    }

    /// What to do when Return is pressed with the caret on `line`.
    public static func listContinuation(forLine line: String) -> ListContinuation {
        if let g = Rx.groups("^(\\s*)([-*+])\\s+\\[[ xX]\\]\\s+(.*)$", line) {
            return g[3].isEmpty ? .exit : .next("\(g[1])\(g[2]) [ ] ")
        }
        if let g = Rx.groups("^(\\s*)(\\d+)([.)])\\s+(.*)$", line) {
            if g[4].isEmpty { return .exit }
            let n = (Int(g[2]) ?? 1) + 1
            return .next("\(g[1])\(n)\(g[3]) ")
        }
        if let g = Rx.groups("^(\\s*)([-*+])\\s+(.*)$", line) {
            return g[3].isEmpty ? .exit : .next("\(g[1])\(g[2]) ")
        }
        return .none
    }
}
