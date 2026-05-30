import SwiftUI
import MarkupKit

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
    }

    // MARK: - Sidebar

    @ViewBuilder
    private var sidebar: some View {
        Group {
            if vault.rootURL == nil {
                emptyState
            } else if vault.files.isEmpty {
                ContentUnavailableView(
                    "No Markdown files",
                    systemImage: "doc.text",
                    description: Text("This folder has no .md files."))
            } else {
                List(vault.files, selection: $selection) { file in
                    NavigationLink(value: file) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(file.name)
                                if file.relPath != file.name {
                                    Text(file.relPath)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }
                            }
                        } icon: {
                            Image(systemName: "doc.richtext")
                        }
                    }
                }
            }
        }
        .navigationTitle(vault.rootName)
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                if vault.rootURL != nil {
                    Button { showQuickOpen = true } label: { Image(systemName: "magnifyingglass") }
                        .accessibilityLabel("Quick Open")
                        .keyboardShortcut("p", modifiers: .command)
                    Menu {
                        Button { showSearch = true } label: { Label("Search vault", systemImage: "text.magnifyingglass") }
                            .keyboardShortcut("f", modifiers: [.command, .shift])
                        Button { showTags = true } label: { Label("Tags", systemImage: "number") }
                        Button { showSettings = true } label: { Label("Settings", systemImage: "gearshape") }
                        Button { showPicker = true } label: { Label("Open folder", systemImage: "folder.badge.plus") }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                } else {
                    Button { showPicker = true } label: { Image(systemName: "folder.badge.plus") }
                        .accessibilityLabel("Open folder")
                }
            }
        }
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("Open a vault", systemImage: "books.vertical")
        } description: {
            Text("Point Markup at a folder of Markdown files — the same one you use on your Mac, via iCloud Drive or Files.")
        } actions: {
            Button("Open a Folder") { showPicker = true }
                .buttonStyle(.borderedProminent)
        }
    }

    // MARK: - Detail

    @ViewBuilder
    private var detail: some View {
        if let file = selection, let content = vault.content(of: file) {
            ReaderView(file: file, content: content, vault: vault, onOpen: open)
                .id(file.relPath)
        } else if selection != nil {
            ContentUnavailableView(
                "Couldn't read file", systemImage: "exclamationmark.triangle")
        } else {
            ContentUnavailableView(
                "Select a note", systemImage: "doc.text",
                description: Text("Pick a file to read it here."))
        }
    }
}
