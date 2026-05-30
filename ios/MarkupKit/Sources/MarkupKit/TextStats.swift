import Foundation

/// Word count: each CJK character counts as one word; runs of non-whitespace
/// count as one word. Faithful port of `countWords` in `src/lib/text-stats.ts`.
public func countWords(_ text: String) -> Int {
    var cjk = 0
    var scalars: [Unicode.Scalar] = []
    scalars.reserveCapacity(text.unicodeScalars.count)
    for scalar in text.unicodeScalars {
        if isCJK(scalar.value) {
            cjk += 1
            scalars.append(" ")
        } else {
            scalars.append(scalar)
        }
    }
    let nonCjk = String(String.UnicodeScalarView(scalars))
    let trimmed = nonCjk.trimmingCharacters(in: .whitespacesAndNewlines)
    let words = trimmed.isEmpty ? 0 : trimmed.split(whereSeparator: { $0.isWhitespace }).count
    return cjk + words
}

/// UTF-8 byte length.
public func byteSize(_ text: String) -> Int { text.utf8.count }

/// Human-readable byte count ("999 B", "12.3 KB", "4.5 MB").
public func humanSize(_ bytes: Int) -> String {
    if bytes < 1024 { return "\(bytes) B" }
    if bytes < 1024 * 1024 { return String(format: "%.1f KB", Double(bytes) / 1024) }
    return String(format: "%.1f MB", Double(bytes) / (1024 * 1024))
}

private func isCJK(_ v: UInt32) -> Bool {
    (0x3400...0x9FFF).contains(v) || (0xF900...0xFAFF).contains(v)
}
