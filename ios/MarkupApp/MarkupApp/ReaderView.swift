import SwiftUI
import MarkupKit

/// Renders one note as a page, with theme + text-size controls, reading-position
/// memory, and tap-to-toggle task lists. Reading is the default surface.
struct ReaderView: View {
    let file: VaultFile
    private let vault: VaultStore

    @State private var content: String

    @AppStorage("reader.theme") private var themeRaw = ReaderTheme.light.rawValue
    @AppStorage("reader.fontScale") private var fontScale = 1.0
    @AppStorage("reader.maxWidth") private var maxWidth = 720

    private let positions = ReadingPositionStore.shared

    init(file: VaultFile, content: String, vault: VaultStore) {
        self.file = file
        self.vault = vault
        _content = State(initialValue: content)
    }

    private var theme: ReaderTheme { ReaderTheme(rawValue: themeRaw) ?? .light }

    private var baseURL: URL {
        URL(fileURLWithPath: file.path).deletingLastPathComponent()
    }

    private var html: String {
        ReaderHTML.document(
            markdown: content, title: file.name, theme: theme,
            fontScale: fontScale, maxWidth: maxWidth,
            restoreFraction: positions.position(for: file.relPath))
    }

    var body: some View {
        ReaderWebView(
            html: html,
            baseURL: baseURL,
            onScroll: { fraction in positions.save(fraction, for: file.relPath) },
            onToggleTask: { index in
                if let updated = MarkdownTasks.toggle(content, at: index),
                   vault.write(updated, to: file) {
                    content = updated
                }
            }
        )
        .ignoresSafeArea(edges: .bottom)
        .navigationTitle(file.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Picker("Theme", selection: $themeRaw) {
                        ForEach(ReaderTheme.allCases, id: \.rawValue) { t in
                            Text(t.rawValue.capitalized).tag(t.rawValue)
                        }
                    }
                    Section("Text size") {
                        Button { fontScale = min(2.0, fontScale + 0.1) } label: {
                            Label("Larger", systemImage: "plus.magnifyingglass")
                        }
                        Button { fontScale = max(0.6, fontScale - 0.1) } label: {
                            Label("Smaller", systemImage: "minus.magnifyingglass")
                        }
                        Button { fontScale = 1.0 } label: {
                            Label("Reset size", systemImage: "arrow.counterclockwise")
                        }
                    }
                } label: {
                    Image(systemName: "textformat.size")
                }
            }
        }
    }
}
