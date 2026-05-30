import Foundation

/// A parsed `[[wikilink]]`. `target` is the file name part; `heading` is the
/// optional `#section`; `label` is the optional `|alias`; `isEmbed` is `![[…]]`.
public struct Wikilink: Equatable, Sendable {
    public var target: String
    public var heading: String?
    public var label: String?
    public var isEmbed: Bool

    public init(target: String, heading: String?, label: String?, isEmbed: Bool) {
        self.target = target
        self.heading = heading
        self.label = label
        self.isEmbed = isEmbed
    }
}

/// Extract all `[[wikilinks]]` / `![[embeds]]` from text, including
/// `[[name#heading|label]]` forms.
public func parseWikilinks(_ text: String) -> [Wikilink] {
    // (!)? [[ inner (| label)? ]]   — inner = name(#heading)?
    let pattern = "(!)?\\[\\[\\s*([^\\]|]+?)\\s*(?:\\|([^\\]]*))?\\]\\]"
    return Rx.allGroups(pattern, text).compactMap { g in
        let inner = g[2].trimmingCharacters(in: .whitespaces)
        if inner.isEmpty { return nil }
        var target = inner
        var heading: String? = nil
        if let hash = inner.firstIndex(of: "#") {
            target = String(inner[..<hash]).trimmingCharacters(in: .whitespaces)
            let h = String(inner[inner.index(after: hash)...]).trimmingCharacters(in: .whitespaces)
            heading = h.isEmpty ? nil : h
        }
        if target.isEmpty { return nil }
        let label = g[3].isEmpty ? nil : g[3].trimmingCharacters(in: .whitespaces)
        return Wikilink(target: target, heading: heading, label: label, isEmbed: g[1] == "!")
    }
}

/// Resolve a wikilink name to a vault file. Preference:
/// 1. exact basename · 2. exact basename w/o extension ·
/// 3. case-insensitive basename · 4. case-insensitive basename w/o extension.
/// Faithful port of `findVaultFile` in `src/lib/wikilink.ts`.
public func findVaultFile(_ files: [VaultFile], name: String) -> VaultFile? {
    let trimmed = name.trimmingCharacters(in: .whitespaces)
    if trimmed.isEmpty { return nil }

    let lc = trimmed.lowercased()
    let lcStripped = stripMarkdownExt(lc)

    var lcExact: VaultFile? = nil
    var lcStrippedHit: VaultFile? = nil
    for f in files {
        if f.name == trimmed { return f }
        if stripMarkdownExt(f.name) == trimmed { return f }
        if lcExact == nil, f.name.lowercased() == lc { lcExact = f }
        if lcStrippedHit == nil, stripMarkdownExt(f.name.lowercased()) == lcStripped {
            lcStrippedHit = f
        }
    }
    return lcExact ?? lcStrippedHit
}

private func stripMarkdownExt(_ s: String) -> String {
    Rx.matches("\\.(md|markdown|mdx|mkd)$", s, [.caseInsensitive])
        ? s.replacingOccurrences(
            of: "\\.(md|markdown|mdx|mkd)$", with: "", options: .regularExpression)
        : s
}
