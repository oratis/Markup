import Foundation

/// A document heading. `line` is the 0-based source line index.
public struct Heading: Equatable, Sendable, Identifiable {
    public var level: Int
    public var text: String
    public var line: Int

    public var id: Int { line }

    public init(level: Int, text: String, line: Int) {
        self.level = level
        self.text = text
        self.line = line
    }
}

/// Heading scanner — ATX (`# …`) and Setext (`===` / `---`), skipping fenced
/// code. Faithful port of `src/lib/headings.ts`.
public func parseHeadings(_ md: String) -> [Heading] {
    var out: [Heading] = []
    let lines = md.components(separatedBy: "\n")
    var inFence = false
    var fenceMarker = ""

    for i in lines.indices {
        let line = lines[i]
        let trimmed = String(line.drop(while: { $0 == " " || $0 == "\t" }))

        if let fence = Rx.groups("^(```|~~~)", trimmed) {
            if !inFence { inFence = true; fenceMarker = fence[1] }
            else if trimmed.hasPrefix(fenceMarker) { inFence = false }
            continue
        }
        if inFence { continue }

        if let atx = Rx.groups("^(#{1,6})\\s+(.+?)\\s*#*\\s*$", trimmed) {
            out.append(Heading(level: atx[1].count, text: atx[2], line: i))
            continue
        }
        let lineTrim = line.trimmingCharacters(in: .whitespaces)
        if i > 0, Rx.matches("^=+\\s*$", lineTrim) {
            let prev = lines[i - 1].trimmingCharacters(in: .whitespaces)
            if !prev.isEmpty { out.append(Heading(level: 1, text: prev, line: i - 1)) }
            continue
        }
        if i > 0, Rx.matches("^-+\\s*$", lineTrim),
           !lines[i - 1].trimmingCharacters(in: .whitespaces).isEmpty {
            out.append(Heading(level: 2, text: lines[i - 1].trimmingCharacters(in: .whitespaces), line: i - 1))
        }
    }
    return out
}

/// Ancestor chain for a cursor line, shallowest-first.
public func headingBreadcrumb(_ headings: [Heading], cursorLine: Int) -> [Heading] {
    var stack: [Heading] = []
    for h in headings {
        if h.line > cursorLine { break }
        while let last = stack.last, last.level >= h.level { stack.removeLast() }
        stack.append(h)
    }
    return stack
}
