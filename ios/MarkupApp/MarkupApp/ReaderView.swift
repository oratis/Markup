import SwiftUI
import UIKit
import PhotosUI
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
    @State private var htmlReloadToken = 0

    private var isHTML: Bool { FileKind.of(file.name) == .html }

    @StateObject private var proxy = WebViewProxy()
    @State private var editor = EditorController()
    @State private var pickedImage: PhotosPickerItem?
    @State private var showOutline = false
    @State private var showBacklinks = false
    @State private var shareItem: ShareItem?
    @State private var pdfExporter: PDFExporter?

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
            restoreFraction: positions.position(for: file.relPath),
            assetBase: readerAssetBase)
    }

    var body: some View {
        Group {
            if isEditing {
                SourceEditorView(text: $content, controller: editor)
                    .onChange(of: content) { _, _ in scheduleSave() }
                    .safeAreaInset(edge: .bottom, spacing: 0) { editorSuggestions }
                    .photosPicker(
                        isPresented: Binding(
                            get: { editor.imagePickerRequested },
                            set: { editor.imagePickerRequested = $0 }),
                        selection: $pickedImage, matching: .images)
                    .onChange(of: pickedImage) { _, item in insertPickedImage(item) }
            } else if isHTML {
                // Render the HTML file faithfully, with read access to the vault
                // so relative CSS/images/links resolve.
                ReaderWebView(
                    fileURL: URL(fileURLWithPath: file.path),
                    readAccessURL: vault.rootURL,
                    loadToken: htmlReloadToken,
                    proxy: proxy,
                    onScroll: { positions.save($0, for: file.relPath) })
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
        .sheet(item: $shareItem) { ActivityView(items: [$0.url]) }
        .onDisappear { saveNow() }
        .alert(t(.conflictTitle), isPresented: $showConflict) {
            Button(t(.keepMine), role: .destructive) { forceWrite() }
            Button(t(.reload), role: .cancel) { reloadFromDisk() }
        } message: {
            Text(t(.conflictBody))
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                if isEditing {
                    saveNow()
                    if isHTML { htmlReloadToken += 1 }
                }
                isEditing.toggle()
            } label: {
                Image(systemName: isEditing ? "book" : "pencil")
            }
            .accessibilityLabel(isEditing ? t(.read) : t(.edit))
            .keyboardShortcut("e", modifiers: .command)
        }
        if !isEditing && isHTML {
            ToolbarItem(placement: .topBarTrailing) {
                Button { shareItem = ShareItem(url: URL(fileURLWithPath: file.path)) } label: {
                    Image(systemName: "square.and.arrow.up")
                }
                .accessibilityLabel(t(.share))
            }
        }
        if !isEditing && !isHTML {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { showOutline = true } label: { Image(systemName: "list.bullet.indent") }
                    .accessibilityLabel(t(.outline))
                    .keyboardShortcut("o", modifiers: [.command, .option])
                Button { showBacklinks = true } label: { Image(systemName: "link") }
                    .accessibilityLabel(t(.backlinks))
                Menu {
                    Button { shareHTML() } label: { Label(t(.shareAsHTML), systemImage: "safari") }
                    Button { sharePDF() } label: { Label(t(.exportPDF), systemImage: "doc.richtext") }
                    Button { shareMarkdown() } label: { Label(t(.shareMarkdown), systemImage: "doc.plaintext") }
                    Divider()
                    Button { copyHTML() } label: { Label(t(.copyAsHTML), systemImage: "doc.on.doc") }
                    Button { copyMarkdown() } label: { Label(t(.copyMarkdown), systemImage: "doc.on.clipboard") }
                } label: {
                    Image(systemName: "square.and.arrow.up")
                }
                Menu {
                    Picker(t(.theme), selection: $themeRaw) {
                        ForEach(ReaderTheme.allCases, id: \.rawValue) { t in
                            Text(t.rawValue.capitalized).tag(t.rawValue)
                        }
                    }
                    Section(t(.textSize)) {
                        Button { fontScale = min(2.0, fontScale + 0.1) } label: {
                            Label(t(.larger), systemImage: "plus.magnifyingglass")
                        }
                        Button { fontScale = max(0.6, fontScale - 0.1) } label: {
                            Label(t(.smaller), systemImage: "minus.magnifyingglass")
                        }
                        Button { fontScale = 1.0 } label: {
                            Label(t(.resetSize), systemImage: "arrow.counterclockwise")
                        }
                    }
                } label: {
                    Image(systemName: "textformat.size")
                }
            }
        }
    }

    // MARK: - Inline [[ wikilink autocomplete

    /// Up to 6 fuzzy-ranked notes for the active `[[` query.
    private func wikilinkMatches(_ q: String) -> [VaultFile] {
        let query = q.lowercased()
        let candidates = vault.files.filter { FileKind.of($0.name) != .canvas }
        if query.isEmpty { return Array(candidates.prefix(6)) }
        return candidates
            .map { ($0, scoreSubsequence($0.relPath.lowercased(), query)) }
            .filter { $0.1 > -.infinity }
            .sorted { $0.1 > $1.1 }
            .prefix(6)
            .map { $0.0 }
    }

    /// Up to 6 tags matching the active `#` query (prefix, then by frequency).
    private func tagMatches(_ q: String) -> [String] {
        let all = ((try? vault.index?.allTags()) ?? []).map(\.tag)
        let query = q.lowercased()
        if query.isEmpty { return Array(all.prefix(6)) }
        return all.filter { $0.lowercased().contains(query) }.prefix(6).map { $0 }
    }

    /// A horizontal strip of suggestion chips above the keyboard: `[[` note
    /// links take precedence, else `#` tags.
    @ViewBuilder
    private var editorSuggestions: some View {
        if let q = editor.wikilinkQuery {
            let matches = wikilinkMatches(q)
            if !matches.isEmpty {
                suggestionStrip(matches.map { (f: VaultFile) in
                    let title = (f.name as NSString).deletingPathExtension
                    return Chip(id: f.relPath, label: title, icon: "doc.text") {
                        editor.insertWikilink?(title)
                    }
                })
            }
        } else if let q = editor.tagQuery {
            let matches = tagMatches(q)
            if !matches.isEmpty {
                suggestionStrip(matches.map { tag in
                    Chip(id: tag, label: tag, icon: "number") { editor.insertTag?(tag) }
                })
            }
        }
    }

    private struct Chip: Identifiable {
        let id: String
        let label: String
        let icon: String
        let action: () -> Void
    }

    private func suggestionStrip(_ chips: [Chip]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(chips) { chip in
                    Button(action: chip.action) {
                        Label(chip.label, systemImage: chip.icon)
                            .font(.callout)
                            .lineLimit(1)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(.quaternary, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Insert \(chip.label)")
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
        }
        .background(.regularMaterial)
    }

    // MARK: - Image insert

    /// Load the picked photo, copy it into the vault's `assets/`, and insert a
    /// Markdown image reference at the caret.
    private func insertPickedImage(_ item: PhotosPickerItem?) {
        guard let item else { return }
        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                let ext = item.supportedContentTypes.first?.preferredFilenameExtension ?? "png"
                if let rel = vault.writeAsset(data, ext: ext) {
                    editor.insertText?("![](\(rel))")
                }
            }
            pickedImage = nil
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

    // MARK: - Sharing

    private func shareHTML() {
        if let url = ShareService.writeHTML(content: content, title: file.name, theme: theme) {
            shareItem = ShareItem(url: url)
        }
    }

    private func shareMarkdown() {
        if let url = ShareService.writeMarkdown(content: content, title: file.name) {
            shareItem = ShareItem(url: url)
        }
    }

    private func copyHTML() {
        UIPasteboard.general.string = ReaderHTML.document(
            markdown: content, title: file.name, theme: theme)
    }

    private func copyMarkdown() {
        UIPasteboard.general.string = content
    }

    private func sharePDF() {
        let exporter = PDFExporter(title: file.name)
        pdfExporter = exporter
        exporter.export(content: content, theme: theme) { url in
            if let url { shareItem = ShareItem(url: url) }
            pdfExporter = nil
        }
    }
}
