import SwiftUI
import MarkupKit

/// A compact row for a vault file: kind icon + name, with a secondary line
/// of relative path · relative modified time.
struct FileRow: View {
    let file: VaultFile
    /// Show the kind icon (file list). Off in already-scoped contexts
    /// (Quick Open / tag drill-downs) where the leading glyph adds noise.
    var showIcon: Bool = false

    private var iconName: String {
        switch FileKind.of(file.name) {
        case .html: return "globe"
        case .canvas: return "rectangle.3.group"
        default: return "doc.richtext"
        }
    }

    private var subtitle: String? {
        var parts: [String] = []
        if file.relPath != file.name { parts.append(file.relPath) }
        if file.mtimeMs > 0 { parts.append(RelTime.string(file.mtimeMs)) }
        return parts.isEmpty ? nil : parts.joined(separator: "  ·  ")
    }

    var body: some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(file.name)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                }
            }
        } icon: {
            if showIcon { Image(systemName: iconName) }
        }
    }
}

/// Fuzzy file jump (⌘P spirit), ranked with `scoreSubsequence`.
struct QuickOpenView: View {
    let vault: VaultStore
    var onOpen: (VaultFile) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""

    private var results: [VaultFile] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if q.isEmpty { return Array(vault.files.prefix(50)) }
        return vault.files
            .map { ($0, scoreSubsequence($0.relPath.lowercased(), q)) }
            .filter { $0.1 > -.infinity }
            .sorted { $0.1 > $1.1 }
            .prefix(50)
            .map { $0.0 }
    }

    var body: some View {
        NavigationStack {
            List(results) { file in
                Button { onOpen(file); dismiss() } label: { FileRow(file: file) }
            }
            .searchable(
                text: $query,
                placement: .navigationBarDrawer(displayMode: .always),
                prompt: t(.jumpToFile))
            .navigationTitle(t(.quickOpen))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.done)) { dismiss() } } }
        }
    }
}

/// Full-text search across the vault (SQLite FTS5, with `tag:` / `path:`).
struct SearchView: View {
    let vault: VaultStore
    var onOpen: (VaultFile) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var hits: [SearchHit] = []

    var body: some View {
        NavigationStack {
            List(hits) { hit in
                Button {
                    if let f = vault.file(forRelPath: hit.path) { onOpen(f); dismiss() }
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(hit.title)
                        if !hit.snippet.isEmpty {
                            Text(highlightedSnippet(hit.snippet))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                        Text(hit.path).font(.caption2).foregroundStyle(.tertiary).lineLimit(1)
                    }
                }
            }
            .overlay {
                if hits.isEmpty {
                    Text(query.isEmpty ? t(.searchYourVault) : t(.noMatches))
                        .foregroundStyle(.secondary)
                }
            }
            .searchable(text: $query, prompt: t(.searchVaultPrompt))
            .onChange(of: query) { _, q in
                let trimmed = q.trimmingCharacters(in: .whitespaces)
                hits = trimmed.isEmpty ? [] : ((try? vault.index?.search(trimmed)) ?? [])
            }
            .navigationTitle(t(.search))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.done)) { dismiss() } } }
        }
    }
}

/// Shown when a `.canvas` file is selected: Canvas is a desktop-only feature,
/// so iOS preserves the file untouched and points the user to Markup for Mac.
struct CanvasPlaceholderView: View {
    let file: VaultFile

    private var counts: CanvasInfo.Counts {
        let text = (try? String(contentsOfFile: file.path, encoding: .utf8)) ?? ""
        return CanvasInfo.counts(fromJSON: text)
    }

    var body: some View {
        let c = counts
        VStack(spacing: 12) {
            Image(systemName: "rectangle.3.group")
                .font(.system(size: 44))
                .foregroundStyle(.secondary)
            Text(file.name).font(.headline)
            Text("\(t(.canvasTitle)). \(t(.canvasBody))")
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Text(String(format: t(.nodesEdgesFmt), c.nodes, c.edges))
                .font(.caption)
                .foregroundStyle(.tertiary)
            Link(t(.getMac),
                 destination: URL(string: "https://github.com/oratis/Markup")!)
                .font(.callout)
                .padding(.top, 4)
        }
        .padding(40)
        .navigationTitle(file.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// Turn an FTS snippet (matched terms wrapped in `«…»`) into an AttributedString
/// that renders the matches in bold, with the markers removed.
func highlightedSnippet(_ raw: String) -> AttributedString {
    var result = AttributedString()
    var rest = Substring(raw)
    while let open = rest.firstIndex(of: "«") {
        result += AttributedString(rest[rest.startIndex..<open])
        let afterOpen = rest.index(after: open)
        if let close = rest[afterOpen...].firstIndex(of: "»") {
            var match = AttributedString(rest[afterOpen..<close])
            match.font = .caption.bold()
            result += match
            rest = rest[rest.index(after: close)...]
        } else {
            rest = rest[afterOpen...]
        }
    }
    result += AttributedString(rest)
    return result
}

/// Tag browser → notes carrying a tag.
struct TagsView: View {
    let vault: VaultStore
    var onOpen: (VaultFile) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var tags: [TagCount] = []

    var body: some View {
        NavigationStack {
            List(tags) { tag in
                NavigationLink {
                    TagFilesView(vault: vault, tag: tag.tag, onOpen: onOpen)
                } label: {
                    HStack {
                        Label(tag.tag, systemImage: "number")
                        Spacer()
                        Text("\(tag.count)").foregroundStyle(.secondary)
                    }
                }
            }
            .overlay { if tags.isEmpty { Text(t(.noTags)).foregroundStyle(.secondary) } }
            .navigationTitle(t(.tags))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.done)) { dismiss() } } }
            .task { tags = (try? vault.index?.allTags()) ?? [] }
        }
    }
}

struct TagFilesView: View {
    let vault: VaultStore
    let tag: String
    var onOpen: (VaultFile) -> Void
    @State private var files: [VaultFile] = []

    var body: some View {
        List(files) { file in
            Button { onOpen(file) } label: { FileRow(file: file) }
        }
        .navigationTitle("#\(tag)")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            let paths = (try? vault.index?.paths(withTag: tag)) ?? []
            files = paths.compactMap { vault.file(forRelPath: $0) }
        }
    }
}

/// Heading outline of the current note; tapping scrolls the reader.
struct OutlineView: View {
    let content: String
    let proxy: WebViewProxy
    @Environment(\.dismiss) private var dismiss

    private var headings: [Heading] { parseHeadings(content) }

    var body: some View {
        NavigationStack {
            List(Array(headings.enumerated()), id: \.offset) { index, heading in
                Button {
                    proxy.scrollToHeading(index)
                    dismiss()
                } label: {
                    Text(heading.text)
                        .padding(.leading, CGFloat(max(0, heading.level - 1)) * 14)
                        .foregroundStyle(heading.level == 1 ? .primary : .secondary)
                }
            }
            .overlay { if headings.isEmpty { Text(t(.noHeadings)).foregroundStyle(.secondary) } }
            .navigationTitle(t(.outline))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.done)) { dismiss() } } }
        }
    }
}

/// Notes that link to the current note.
struct BacklinksView: View {
    let vault: VaultStore
    let file: VaultFile
    var onOpen: (VaultFile) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var hits: [BacklinkHit] = []

    var body: some View {
        NavigationStack {
            List(hits) { hit in
                Button {
                    if let f = vault.file(forRelPath: hit.source) { onOpen(f); dismiss() }
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text((hit.source as NSString).lastPathComponent)
                        if !hit.context.isEmpty {
                            Text(hit.context)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                        Text(hit.source).font(.caption2).foregroundStyle(.tertiary).lineLimit(1)
                    }
                }
            }
            .overlay { if hits.isEmpty { Text(t(.noBacklinks)).foregroundStyle(.secondary) } }
            .navigationTitle(t(.backlinks))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.done)) { dismiss() } } }
            .task { hits = (try? vault.index?.backlinkHits(toName: file.name)) ?? [] }
        }
    }
}
