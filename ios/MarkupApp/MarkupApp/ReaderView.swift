import SwiftUI
import MarkupKit

/// Renders one note as a page, with theme + text-size controls, reading-position
/// memory, tap-to-toggle task lists, and outline/backlinks. Reading is default.
struct ReaderView: View {
    let file: VaultFile
    private let vault: VaultStore
    private let onOpen: (VaultFile) -> Void

    @State private var content: String
    @StateObject private var proxy = WebViewProxy()
    @State private var showOutline = false
    @State private var showBacklinks = false

    @AppStorage("reader.theme") private var themeRaw = ReaderTheme.light.rawValue
    @AppStorage("reader.fontScale") private var fontScale = 1.0
    @AppStorage("reader.maxWidth") private var maxWidth = 720

    private let positions = ReadingPositionStore.shared

    init(file: VaultFile, content: String, vault: VaultStore, onOpen: @escaping (VaultFile) -> Void) {
        self.file = file
        self.vault = vault
        self.onOpen = onOpen
        _content = State(initialValue: content)
    }

    private var theme: ReaderTheme { ReaderTheme(rawValue: themeRaw) ?? .light }
    private var baseURL: URL { URL(fileURLWithPath: file.path).deletingLastPathComponent() }

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
            proxy: proxy,
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
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { showOutline = true } label: { Image(systemName: "list.bullet.indent") }
                    .accessibilityLabel("Outline")
                Button { showBacklinks = true } label: { Image(systemName: "link") }
                    .accessibilityLabel("Backlinks")
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
        .sheet(isPresented: $showOutline) {
            OutlineView(content: content, proxy: proxy)
        }
        .sheet(isPresented: $showBacklinks) {
            BacklinksView(vault: vault, file: file, onOpen: onOpen)
        }
    }
}
