import Foundation

/// Extract `#tags` from a Markdown document — frontmatter `tags:` (inline +
/// block) plus inline `#tag` / `#tag/sub` in the body, excluding code fences,
/// inline code, ATX heading markers, and pure-numeric tags. Faithful port of
/// `src/lib/tag-extract.ts`.
public func extractTags(_ content: String) -> Set<String> {
    if content.isEmpty { return [] }
    var (tags, bodyOffset) = frontmatterTags(content)
    let body = String(content.dropFirst(bodyOffset))
    let lines = body.components(separatedBy: "\n")

    var inFence = false
    var fenceMarker = ""
    for rawLine in lines {
        let trimmed = String(rawLine.drop(while: { $0 == " " || $0 == "\t" }))
        if let fence = Rx.groups("^(```|~~~)", trimmed) {
            if !inFence { inFence = true; fenceMarker = fence[1] }
            else if trimmed.hasPrefix(fenceMarker) { inFence = false }
            continue
        }
        if inFence { continue }

        // Mask inline code spans, then the heading prefix.
        let noHeading = rawLine.replacingOccurrences(
            of: "^\\s*#{1,6}\\s", with: "", options: .regularExpression)
        let masked = noHeading.replacingOccurrences(
            of: "`[^`\\n]*`", with: " ", options: .regularExpression)

        for g in Rx.allGroups("(?:^|[^\\p{L}\\p{N}_])#([\\p{L}\\p{N}_][\\p{L}\\p{N}_/-]*)", masked) {
            let tag = trimTrailingSep(g[1])
            if tag.isEmpty { continue }
            if Rx.matches("^\\d+$", tag) { continue } // pure numeric
            tags.insert(tag)
        }
    }
    return tags
}

/// Nested-tag ancestors: `a/b/c` → ["a", "a/b", "a/b/c"].
public func tagAncestors(_ tag: String) -> [String] {
    let parts = tag.split(separator: "/").map(String.init)
    var out: [String] = []
    for i in parts.indices { out.append(parts[0...i].joined(separator: "/")) }
    return out
}

// MARK: - Private

private func frontmatterTags(_ content: String) -> (tags: Set<String>, bodyOffset: Int) {
    var out: Set<String> = []
    guard content.hasPrefix("---\n") || content.hasPrefix("---\r\n") else { return (out, 0) }

    let ns = content as NSString
    let close = ns.range(of: "\n---", options: [], range: NSRange(location: 4, length: ns.length - 4))
    if close.location == NSNotFound { return (out, 0) }

    let fm = ns.substring(with: NSRange(location: 4, length: close.location - 4))
    let afterClose = ns.range(
        of: "\n", options: [], range: NSRange(location: close.location + 1, length: ns.length - close.location - 1))
    let bodyOffset = afterClose.location == NSNotFound ? ns.length : afterClose.location + afterClose.length

    // Inline array: tags: [a, b, "c d"]
    if let inline = Rx.groups("^tags:\\s*\\[(.*)\\]\\s*$", fm, [.anchorsMatchLines]) {
        for raw in inline[1].split(separator: ",", omittingEmptySubsequences: false) {
            let tag = unquoteTag(String(raw))
            if !tag.isEmpty { out.insert(tag) }
        }
    }

    // Block list under `tags:`
    if let block = Rx.groups("^tags:\\s*$\\n((?:[ \\t]+-[ \\t]+[^\\n]+\\n?)+)", fm, [.anchorsMatchLines]) {
        for line in block[1].components(separatedBy: "\n") {
            if let m = Rx.groups("^[ \\t]+-[ \\t]+(.+)$", line) {
                let tag = unquoteTag(m[1])
                if !tag.isEmpty { out.insert(tag) }
            }
        }
    }
    return (out, bodyOffset)
}

private func unquoteTag(_ s: String) -> String {
    let t = s.trimmingCharacters(in: .whitespaces)
        .replacingOccurrences(of: "^['\"]|['\"]$", with: "", options: .regularExpression)
    return t.replacingOccurrences(of: "^#", with: "", options: .regularExpression)
}

private func trimTrailingSep(_ tag: String) -> String {
    tag.replacingOccurrences(of: "[-/]+$", with: "", options: .regularExpression)
}
