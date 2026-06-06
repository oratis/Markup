import SwiftUI
import MarkupKit

/// Identifiable wrapper so a file URL opened from another app can drive a sheet.
/// `readAccessRoot` (set for GitHub working copies) is the directory the reader
/// may read relative assets from.
private struct OpenedURL: Identifiable {
    let url: URL
    var readAccessRoot: URL? = nil
    var sourceLink: GitHubLink? = nil
    var id: String { url.absoluteString }
}

/// Identifiable wrapper so a `markup://` directory deep-link can drive a sheet.
private struct BrowseLink: Identifiable {
    let link: GitHubLink
    var id: String { "\(link.owner)/\(link.repo)@\(link.ref ?? "")/\(link.path)" }
}

/// App shell: a sidebar list of `.md` files and a reader detail. Adaptive —
/// `NavigationSplitView` is multi-column on iPad and a stack on iPhone.
struct RootView: View {
    @State private var vault = VaultStore()
    @State private var selection: VaultFile?
    @State private var tabs = OpenTabsStore()
    @State private var showPicker = false
    @State private var showQuickOpen = false
    @State private var showSearch = false
    @State private var showTags = false
    @State private var showSettings = false
    @State private var showRecents = false
    @State private var showVaultSwitcher = false
    @State private var showGitHub = false
    @State private var openedFile: OpenedURL?
    @State private var githubBrowse: BrowseLink?
    /// relPath of a just-created note that should open straight into edit mode.
    @State private var pendingEditFileId: String?
    @State private var renameTarget: VaultFile?
    @State private var renameText = ""

    /// Create a blank note and open it straight into edit mode.
    private func newNote() {
        guard let f = vault.createNote() else { return }
        pendingEditFileId = f.relPath
        selection = f
    }

    /// Route an inbound URL. `file://` (Files / share-sheet) opens in the reader;
    /// `markup://github?repo=…` deep-links download a single file into the reader
    /// or browse a repo folder. Anything unparseable is ignored.
    private func handleOpenURL(_ url: URL) {
        guard url.scheme?.lowercased() == "markup" else {
            openedFile = OpenedURL(url: url)
            return
        }
        guard let link = GitHubLinkParser.parseAppLink(url.absoluteString) else { return }
        if link.isDirectory {
            githubBrowse = BrowseLink(link: link)
        } else {
            Task {
                if let doc = try? await GitHubService.shared.openFile(link) {
                    openedFile = OpenedURL(
                        url: doc.fileURL, readAccessRoot: doc.root, sourceLink: doc.link)
                }
            }
        }
    }

    private func open(_ file: VaultFile) {
        selection = file
        showQuickOpen = false
        showSearch = false
        showTags = false
    }

    /// Close `file`'s tab; if it was the active one, activate its neighbour.
    private func closeTab(_ file: VaultFile) {
        let next = tabs.close(file)
        if selection == file { selection = next }
    }

    var body: some View {
        NavigationSplitView {
            sidebar
        } detail: {
            detail
        }
        .task { if vault.rootURL == nil { vault.restore() } }
        // Any selection (sidebar tap, quick-open, search, new note) opens a tab.
        .onChange(of: selection) { _, new in
            if let f = new { tabs.open(f) }
        }
        // Switching vaults clears the open tabs of the previous one.
        .onChange(of: vault.rootURL) { _, _ in
            tabs.closeAll()
            selection = nil
        }
        .onOpenURL { url in handleOpenURL(url) }
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
        .sheet(isPresented: $showVaultSwitcher) {
            VaultSwitcherView(vault: vault, onOpenAnother: { showPicker = true })
        }
        .sheet(isPresented: $showGitHub) {
            GitHubOpenView(onOpen: {
                openedFile = OpenedURL(url: $0.fileURL, readAccessRoot: $0.root, sourceLink: $0.link)
            })
        }
        .sheet(item: $openedFile) {
            ExternalFileReader(url: $0.url, readAccessRoot: $0.readAccessRoot, sourceLink: $0.sourceLink)
        }
        .sheet(item: $githubBrowse) { item in
            NavigationStack {
                GitHubBrowseView(link: item.link, onOpenFile: { doc in
                    githubBrowse = nil
                    openedFile = OpenedURL(
                        url: doc.fileURL, readAccessRoot: doc.root, sourceLink: doc.link)
                })
                .navigationDestination(for: GitHubLink.self) { child in
                    GitHubBrowseView(link: child, onOpenFile: { doc in
                        githubBrowse = nil
                        openedFile = OpenedURL(
                            url: doc.fileURL, readAccessRoot: doc.root, sourceLink: doc.link)
                    })
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(t(.cancel)) { githubBrowse = nil }
                    }
                }
            }
        }
        .alert(t(.rename), isPresented: Binding(
            get: { renameTarget != nil },
            set: { if !$0 { renameTarget = nil } })) {
            TextField(t(.newNote), text: $renameText)
            Button(t(.cancel), role: .cancel) { renameTarget = nil }
            Button(t(.rename)) {
                if let target = renameTarget, let renamed = vault.rename(target, toBase: renameText) {
                    tabs.replace(target, with: renamed)
                    if selection == target { selection = renamed }
                }
                renameTarget = nil
            }
        }
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
                            closeTab(file)
                            vault.delete(file)
                        } label: { Label(t(.delete), systemImage: "trash") }
                    }
                    .swipeActions(edge: .leading) {
                        Button {
                            renameText = (file.name as NSString).deletingPathExtension
                            renameTarget = file
                        } label: { Label(t(.rename), systemImage: "pencil") }
                        .tint(.blue)
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
                    Button { showGitHub = true } label: { Label(t(.openFromGitHub), systemImage: "chevron.left.forwardslash.chevron.right") }
                    Button { showSettings = true } label: { Label(t(.settings), systemImage: "gearshape") }
                    Button { showVaultSwitcher = true } label: { Label(t(.switchVault), systemImage: "folder.badge.plus") }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            } else {
                Button { showGitHub = true } label: {
                    Image(systemName: "chevron.left.forwardslash.chevron.right")
                }
                .accessibilityLabel(t(.openFromGitHub))
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
        VStack(spacing: 0) {
            if tabs.count > 1 {
                TabStripView(tabs: tabs, selection: $selection, onClose: closeTab)
                Divider()
            }
            detailContent
        }
        .background(
            // Hidden ⌘W to close the active document's tab (iPad keyboard).
            Button("") { if let f = selection { closeTab(f) } }
                .keyboardShortcut("w", modifiers: .command)
                .hidden()
        )
    }

    @ViewBuilder
    private var detailContent: some View {
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
