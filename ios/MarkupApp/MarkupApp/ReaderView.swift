import SwiftUI
import MarkupKit

/// One note: reads as a rendered page, or edits as native Markdown source.
/// Reading is the default; tap the pencil to edit. Edits autosave (debounced,
/// atomic) with a mtime conflict guard.
struct ReaderView: View {
    let file: VaultFile
    private let vault: VaultStore
    private let onOpen: (VaultFile) -> Void

    @State private var content: String
    @State private var loadedMtimeMs: Double
    @State private var isEditing = false
    @State private var showConflict = false
    @State private var saveTask: Task<Void, Never>?

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
        _loadedMtimeMs = State(initialValue: file.mtimeMs)
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
        Group {
            if isEditing {
                SourceEditorView(text: $content)
                    .onChange(of: content) { _, _ in scheduleSave() }
            } else {
                ReaderWebView(
                    html: html,
                    baseURL: baseURL,
                    proxy: proxy,
                    onScroll: { positions.save($0, for: file.relPath) },
                    onToggleTask: { index in
                        if let updated = MarkdownTasks.toggle(content, at: index),
                           vault.write(updated, to: file) {
                            content = updated
                            loadedMtimeMs = vault.modificationDateMs(of: file) ?? loadedMtimeMs
                        }
                    }
                )
            }
        }
        .ignoresSafeArea(edges: .bottom)
        .navigationTitle(file.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbarContent }
        .sheet(isPresented: $showOutline) { OutlineView(content: content, proxy: proxy) }
        .sheet(isPresented: $showBacklinks) { BacklinksView(vault: vault, file: file, onOpen: onOpen) }
        .onDisappear { saveNow() }
        .alert("This note changed on disk", isPresented: $showConflict) {
            Button("Keep mine", role: .destructive) { forceWrite() }
            Button("Reload", role: .cancel) { reloadFromDisk() }
        } message: {
            Text("It was modified elsewhere (e.g. iCloud sync) since you opened it.")
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                if isEditing { saveNow() }
                isEditing.toggle()
            } label: {
                Image(systemName: isEditing ? "book" : "pencil")
            }
            .accessibilityLabel(isEditing ? "Read" : "Edit")
        }
        if !isEditing {
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
    }

    // MARK: - Saving

    private func scheduleSave() {
        saveTask?.cancel()
        saveTask = Task {
            try? await Task.sleep(nanoseconds: 800_000_000)
            if Task.isCancelled { return }
            await MainActor.run { saveNow() }
        }
    }

    private func saveNow() {
        saveTask?.cancel()
        guard isEditing else { return }
        if let disk = vault.modificationDateMs(of: file), disk > loadedMtimeMs + 1 {
            showConflict = true
            return
        }
        forceWrite()
    }

    private func forceWrite() {
        if vault.write(content, to: file) {
            loadedMtimeMs = vault.modificationDateMs(of: file) ?? loadedMtimeMs
        }
    }

    private func reloadFromDisk() {
        if let fresh = vault.content(of: file) {
            content = fresh
            loadedMtimeMs = vault.modificationDateMs(of: file) ?? loadedMtimeMs
        }
    }
}
