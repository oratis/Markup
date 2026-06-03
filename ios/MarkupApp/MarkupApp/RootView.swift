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
    @State private var openedFile: OpenedURL?

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
        .sheet(item: $openedFile) { ExternalFileReader(url: $0.url) }
    }

    // MARK: - Sidebar

    @ViewBuilder
    private var sidebar: some View {
        Group {
            if vault.rootURL == nil {
                emptyState
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
                Button { showQuickOpen = true } label: { Image(systemName: "magnifyingglass") }
                    .accessibilityLabel(t(.quickOpen))
                    .keyboardShortcut("p", modifiers: .command)
                Menu {
                    Button { showSearch = true } label: { Label(t(.search), systemImage: "text.magnifyingglass") }
                        .keyboardShortcut("f", modifiers: [.command, .shift])
                    Button { showTags = true } label: { Label(t(.tags), systemImage: "number") }
                    Button { showSettings = true } label: { Label(t(.settings), systemImage: "gearshape") }
                    Button { showPicker = true } label: { Label(t(.openFolder), systemImage: "folder.badge.plus") }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            } else {
                Button { showPicker = true } label: { Image(systemName: "folder.badge.plus") }
                    .accessibilityLabel(t(.openFolder))
            }
        }
    }

    // Compact, top-aligned empty state.
    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "books.vertical")
                .font(.title)
                .foregroundStyle(.secondary)
            Text(t(.openVault))
                .font(.headline)
            Text(t(.openVaultBody))
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button(t(.openAFolder)) { showPicker = true }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .padding(.top, 2)
            Spacer()
        }
        .padding(.horizontal, 28)
        .padding(.top, 28)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Detail

    @ViewBuilder
    private var detail: some View {
        if let file = selection, FileKind.of(file.name) == .canvas {
            CanvasPlaceholderView(file: file)
                .id(file.relPath)
        } else if let file = selection, let content = vault.content(of: file) {
            ReaderView(file: file, content: content, vault: vault, onOpen: open)
                .id(file.relPath)
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
