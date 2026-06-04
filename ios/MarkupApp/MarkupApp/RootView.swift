import SwiftUI
import MarkupKit

/// Identifiable wrapper so a file URL opened from another app can drive a sheet.
private struct OpenedURL: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

/// App shell: a sidebar list of `.md` files and a reader detail. Adaptive —
/// `NavigationSplitView` is multi-column on iPad and a stack on iPhone.
struct RootView: View {
    @State private var vault = VaultStore()
    @State private var selection: VaultFile?
    @State private var showPicker = false
    @State private var showQuickOpen = false
    @State private var showSearch = false
    @State private var showTags = false
    @State private var showSettings = false
    @State private var showRecents = false
    @State private var openedFile: OpenedURL?
    /// relPath of a just-created note that should open straight into edit mode.
    @State private var pendingEditFileId: String?

    /// Create a blank note and open it straight into edit mode.
    private func newNote() {
        guard let f = vault.createNote() else { return }
        pendingEditFileId = f.relPath
        selection = f
    }

    private func open(_ file: VaultFile) {
        selection = file
        showQuickOpen = false
        showSearch = false
        showTags = false
    }

    var body: some View {
        NavigationSplitView {
            sidebar
        } detail: {
            detail
        }
        .task { if vault.rootURL == nil { vault.restore() } }
        .onOpenURL { url in openedFile = OpenedURL(url: url) }
        .sheet(isPresented: $showPicker) {
            FolderPicker { url in
                vault.openFolder(url)
                showPicker = false
            }
            .ignoresSafeArea()
        }
        .sheet(isPresented: $showQuickOpen) { QuickOpenView(vault: vault, onOpen: open) }
        .sheet(isPresented: $showSearch) { SearchView(vault: vault, onOpen: open) }
        .sheet(isPresented: $showTags) { TagsView(vault: vault, onOpen: open) }
        .sheet(isPresented: $showSettings) { SettingsView(vault: vault) }
        .sheet(isPresented: $showRecents) {
            RecentsView(onOpen: { openedFile = OpenedURL(url: $0) })
        }
        .sheet(item: $openedFile) { ExternalFileReader(url: $0.url) }
    }

    // MARK: - Sidebar

    @ViewBuilder
    private var sidebar: some View {
        Group {
            if vault.rootURL == nil {
                OnboardingView(onOpenFolder: { showPicker = true })
            } else if vault.files.isEmpty {
                ContentUnavailableView(
                    t(.noMarkdownTitle),
                    systemImage: "doc.text",
                    description: Text(t(.noMarkdownBody)))
            } else {
                fileList
            }
        }
        .navigationTitle(vault.rootURL == nil ? "" : vault.rootName)
        .navigationBarTitleDisplayMode(vault.rootURL == nil ? .inline : .large)
        .toolbar { toolbar }
    }

    private var fileList: some View {
        List(selection: $selection) {
            Section {
                ForEach(vault.files) { file in
                    NavigationLink(value: file) {
                        FileRow(file: file, showIcon: true)
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            if selection == file { selection = nil }
                            vault.delete(file)
                        } label: { Label(t(.delete), systemImage: "trash") }
                    }
                }
            } header: {
                VStack(alignment: .leading, spacing: 4) {
                    // Vault path, expressed with "/".
                    Text(vault.rootDisplayPath)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                    if !vault.indexReady {
                        // Index build progress (design §6.1 "Indexing N notes…").
                        HStack(spacing: 6) {
                            ProgressView().controlSize(.mini)
                            Text(vault.indexProgressLabel)
                        }
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    }
                }
                .textCase(nil)
            }
        }
    }

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        ToolbarItemGroup(placement: .primaryAction) {
            if vault.rootURL != nil {
                Button { newNote() } label: { Image(systemName: "square.and.pencil") }
                    .accessibilityLabel(t(.newNote))
                    .keyboardShortcut("n", modifiers: .command)
                Button { showQuickOpen = true } label: { Image(systemName: "magnifyingglass") }
                    .accessibilityLabel(t(.quickOpen))
                    .keyboardShortcut("p", modifiers: .command)
                Menu {
                    Button { showSearch = true } label: { Label(t(.search), systemImage: "text.magnifyingglass") }
                        .keyboardShortcut("f", modifiers: [.command, .shift])
                    Button { showTags = true } label: { Label(t(.tags), systemImage: "number") }
                    Button { showRecents = true } label: { Label(t(.recents), systemImage: "clock") }
                    Button { showSettings = true } label: { Label(t(.settings), systemImage: "gearshape") }
                    Button { showPicker = true } label: { Label(t(.openFolder), systemImage: "folder.badge.plus") }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            } else {
                Button { showRecents = true } label: { Image(systemName: "clock") }
                    .accessibilityLabel(t(.recents))
                Button { showPicker = true } label: { Image(systemName: "folder.badge.plus") }
                    .accessibilityLabel(t(.openFolder))
            }
        }
    }

    // MARK: - Detail

    @ViewBuilder
    private var detail: some View {
        if let file = selection, FileKind.of(file.name) == .canvas {
            CanvasPlaceholderView(file: file)
                .id(file.relPath)
        } else if let file = selection, let content = vault.content(of: file) {
            ReaderView(
                file: file, content: content, vault: vault,
                startEditing: pendingEditFileId == file.relPath, onOpen: open)
                .id(file.relPath)
                .onAppear { pendingEditFileId = nil }
        } else if selection != nil {
            ContentUnavailableView(
                t(.couldntRead), systemImage: "exclamationmark.triangle")
        } else {
            ContentUnavailableView(
                t(.selectNote), systemImage: "doc.text",
                description: Text(t(.selectNoteBody)))
        }
    }
}
