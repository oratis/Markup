import SwiftUI
import MarkupKit

/// Browse a GitHub repo folder: tap folders to go deeper, tap files to open
/// them in the reader. Pushed within the GitHub sheet's NavigationStack.
struct GitHubBrowseView: View {
    let link: GitHubLink
    var onOpenFile: (URL) -> Void

    @State private var entries: [GitHubEntry] = []
    @State private var loading = true
    @State private var error: String?
    @State private var openingId: String?

    private var title: String {
        link.path.isEmpty ? link.repo : (link.path as NSString).lastPathComponent
    }

    var body: some View {
        List {
            if let error {
                Text(error).foregroundStyle(.red).font(.callout)
            }
            ForEach(entries) { e in
                if e.isDir {
                    NavigationLink(value: GitHubService.shared.childLink(link, e)) {
                        Label(e.name, systemImage: "folder")
                    }
                } else {
                    Button { Task { await open(e) } } label: {
                        HStack {
                            Label(e.name, systemImage: icon(e.name))
                            if openingId == e.id {
                                Spacer()
                                ProgressView().controlSize(.small)
                            }
                        }
                    }
                    .disabled(openingId != nil)
                }
            }
        }
        .overlay {
            if loading { ProgressView() }
            else if entries.isEmpty && error == nil {
                Text("Empty folder").foregroundStyle(.secondary)
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func icon(_ name: String) -> String {
        switch FileKind.of(name) {
        case .html: return "globe"
        case .markdown: return "doc.richtext"
        default: return "doc"
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do { entries = try await GitHubService.shared.listDirectory(link) }
        catch { self.error = error.localizedDescription }
    }

    private func open(_ entry: GitHubEntry) async {
        openingId = entry.id
        defer { openingId = nil }
        do {
            let url = try await GitHubService.shared.openFile(
                GitHubService.shared.childLink(link, entry))
            onOpenFile(url)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
