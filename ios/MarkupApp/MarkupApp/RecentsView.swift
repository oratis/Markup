import SwiftUI
import MarkupKit

/// History of files opened from other apps (Share → Markup): favourites first,
/// then recents. Tap to re-open the app-owned copy; swipe to favourite/remove.
struct RecentsView: View {
    var onOpen: (URL) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var entries: [RecentEntry] = []
    private let service = RecentsService.shared

    var body: some View {
        NavigationStack {
            Group {
                if entries.isEmpty {
                    ContentUnavailableView(
                        t(.noRecentsTitle), systemImage: "clock",
                        description: Text(t(.noRecentsBody)))
                } else {
                    List {
                        let favs = entries.filter(\.favorite)
                        if !favs.isEmpty { Section(t(.favorites)) { rows(favs) } }
                        Section(t(.recents)) { rows(entries.filter { !$0.favorite }) }
                    }
                }
            }
            .navigationTitle(t(.recents))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.done)) { dismiss() } } }
            .onAppear(perform: reload)
        }
    }

    private func reload() { entries = service.store.list() }

    private func icon(_ e: RecentEntry) -> String {
        if e.ext == "zip" { return "doc.zipper" }
        switch FileKind.of(e.name) {
        case .html: return "globe"
        default: return "doc.richtext"
        }
    }

    @ViewBuilder
    private func rows(_ list: [RecentEntry]) -> some View {
        ForEach(list) { e in
            Button {
                onOpen(service.url(for: e))
                dismiss()
            } label: {
                Label {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(e.name)
                        Text(RelTime.string(e.addedAt))
                            .font(.caption2).foregroundStyle(.secondary)
                    }
                } icon: {
                    Image(systemName: icon(e))
                }
            }
            .swipeActions(edge: .trailing) {
                Button(role: .destructive) {
                    service.delete(e)
                    reload()
                } label: { Label(t(.remove), systemImage: "trash") }
            }
            .swipeActions(edge: .leading) {
                Button {
                    service.store.toggleFavorite(e.id)
                    reload()
                } label: {
                    Label(t(.favorites), systemImage: e.favorite ? "star.slash" : "star")
                }
                .tint(.yellow)
            }
        }
    }
}
