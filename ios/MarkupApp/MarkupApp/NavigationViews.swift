import SwiftUI
import MarkupKit

/// A compact row for a vault file (name + relative path).
struct FileRow: View {
    let file: VaultFile
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(file.name)
            if file.relPath != file.name {
                Text(file.relPath).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            }
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
                prompt: "Jump to file")
            .navigationTitle("Quick Open")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
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
                        Text(hit.path).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
            }
            .overlay {
                if hits.isEmpty {
                    Text(query.isEmpty ? "Search your vault" : "No matches")
                        .foregroundStyle(.secondary)
                }
            }
            .searchable(text: $query, prompt: "Search vault   (try tag:project, path:journal/)")
            .onChange(of: query) { _, q in
                let trimmed = q.trimmingCharacters(in: .whitespaces)
                hits = trimmed.isEmpty ? [] : ((try? vault.index?.search(trimmed)) ?? [])
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
        }
    }
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
            .overlay { if tags.isEmpty { Text("No tags").foregroundStyle(.secondary) } }
            .navigationTitle("Tags")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
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
            .overlay { if headings.isEmpty { Text("No headings").foregroundStyle(.secondary) } }
            .navigationTitle("Outline")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
        }
    }
}

/// Notes that link to the current note.
struct BacklinksView: View {
    let vault: VaultStore
    let file: VaultFile
    var onOpen: (VaultFile) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var sources: [String] = []

    var body: some View {
        NavigationStack {
            List(sources, id: \.self) { path in
                Button {
                    if let f = vault.file(forRelPath: path) { onOpen(f); dismiss() }
                } label: { Text(path) }
            }
            .overlay { if sources.isEmpty { Text("No backlinks").foregroundStyle(.secondary) } }
            .navigationTitle("Backlinks")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
            .task { sources = (try? vault.index?.backlinks(toName: file.name)) ?? [] }
        }
    }
}
