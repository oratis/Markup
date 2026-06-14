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
    /// "owner/repo" while a repo is being downloaded + opened as a vault.
    @State private var openingVault: String?
    /// Phase label ("Downloading… 42%") shown under the repo name while opening.
    @State private var openingStatus: String?
    @State private var openVaultError: String?
    /// True while an incremental refresh of the current GitHub vault runs.
    @State private var refreshingVault = false
    /// Transient "↻ N updated" / "Up to date" confirmation after a refresh.
    @State private var refreshToast: String?
    /// Non-nil → show the "refresh will overwrite N local edits?" guard alert.
    @State private var dirtyRefreshCount: Int?
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
    /// `markup://github?repo=…` deep-links open a repo root as a vault, browse a
    /// sub-folder, or download a single file into the reader. Unparseable → ignored.
    private func handleOpenURL(_ url: URL) {
        guard url.scheme?.lowercased() == "markup" else {
            openedFile = OpenedURL(url: url)
            return
        }
        guard let link = GitHubLinkParser.parseAppLink(url.absoluteString) else { return }
        if link.isDirectory {
            // Repo root → open the whole repo as a vault; a sub-folder → browse it.
            if link.path.isEmpty {
                openRepoAsVault(link)
            } else {
                githubBrowse = BrowseLink(link: link)
            }
        } else {
            Task {
                if let doc = try? await GitHubService.shared.openFile(link) {
                    openedFile = OpenedURL(
                        url: doc.fileURL, readAccessRoot: doc.root, sourceLink: doc.link)
                }
            }
        }
    }

    /// Download a repo's zipball and open it as the active vault, with a progress
    /// overlay. Switching `vault.rootURL` clears the previous vault's tabs.
    private func openRepoAsVault(_ link: GitHubLink) {
        guard openingVault == nil else { return }
        showGitHub = false
        githubBrowse = nil
        openingVault = "\(link.owner)/\(link.repo)"
        openingStatus = nil
        Task {
            // Stream coarse progress (resolve → download % → extract) into the
            // overlay so a large repo never looks frozen.
            let (stream, cont) = AsyncStream<GitHubService.OpenVaultPhase>.makeStream()
            let consumer = Task { @MainActor in
                for await phase in stream {
                    switch phase {
                    case .resolving:
                        openingStatus = t(.ghPreparing)
                    case .downloading(let f):
                        openingStatus = f.map { "\(t(.ghDownloading)) \(Int($0 * 100))%" }
                            ?? t(.ghDownloading)
                    case .extracting:
                        openingStatus = t(.ghExtracting)
                    }
                }
            }
            defer {
                cont.finish()
                consumer.cancel()
                openingVault = nil
                openingStatus = nil
            }
            do {
                let dir = try await GitHubService.shared.openAsVault(link, progress: cont)
                vault.openLocalVault(dir)
            } catch {
                openVaultError = error.localizedDescription
            }
        }
    }

    /// Pull the latest commit into the current GitHub vault. First checks for
    /// files edited locally since the last sync (off the main actor) and, if
    /// any, asks before overwriting them — a refresh re-downloads changed blobs,
    /// so unguarded it would silently discard local edits.
    private func refreshGitHubVault() {
        guard let root = vault.rootURL, vault.isGitHubVault, !refreshingVault else { return }
        Task {
            let dirty = await Task.detached(priority: .userInitiated) {
                GitHubService.locallyModifiedPaths(at: root)
            }.value
            if dirty.isEmpty {
                performRefresh(root)
            } else {
                dirtyRefreshCount = dirty.count // → confirmation alert
            }
        }
    }

    /// Run the actual incremental refresh (download changed/added, drop removed),
    /// rescan, and show a brief result toast. Called once any local-edit guard
    /// has been cleared.
    private func performRefresh(_ root: URL) {
        guard !refreshingVault else { return }
        refreshingVault = true
        Task {
            let text: String
            do {
                let result = try await GitHubService.shared.refreshVault(at: root)
                vault.reloadAfterRefresh()
                if result.fullReset { text = t(.refreshedFull) }
                else if result.isNoOp { text = t(.refreshUpToDate) }
                else { text = "↻ \(result.changeCount) " + t(.refreshUpdatedSuffix) }
            } catch {
                refreshingVault = false
                openVaultError = error.localizedDescription
                return
            }
            // Drop the "Refreshing…" overlay before showing the result toast.
            refreshingVault = false
            refreshToast = text
            try? await Task.sleep(for: .seconds(2))
            if refreshToast == text { refreshToast = nil }
        }
    }

    /// A centered material card with a spinner and a label — shared by the
    /// "Downloading…" and "Refreshing…" overlays.
    private func progressCard(_ label: some View) -> some View {
        VStack(spacing: 12) {
            ProgressView()
            label
        }
        .padding(28)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .shadow(radius: 20)
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
        .overlay {
            if let repo = openingVault {
                progressCard(
                    VStack(spacing: 3) {
                        Text(repo).font(.callout)
                        if let s = openingStatus {
                            Text(s).font(.caption).foregroundStyle(.secondary)
                        }
                    })
            } else if refreshingVault {
                progressCard(Text(t(.refreshing)).font(.callout).foregroundStyle(.secondary))
            }
        }
        .overlay(alignment: .bottom) {
            if let toast = refreshToast {
                Text(toast)
                    .font(.callout.weight(.medium))
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(.regularMaterial, in: Capsule())
                    .shadow(radius: 8)
                    .padding(.bottom, 24)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.default, value: refreshToast)
        .alert("Couldn't open repository", isPresented: Binding(
            get: { openVaultError != nil }, set: { if !$0 { openVaultError = nil } })) {
            Button(t(.ok), role: .cancel) { openVaultError = nil }
        } message: {
            Text(openVaultError ?? "")
        }
        .alert(t(.refreshOverwriteTitle), isPresented: Binding(
            get: { dirtyRefreshCount != nil }, set: { if !$0 { dirtyRefreshCount = nil } })) {
            Button(t(.cancel), role: .cancel) { dirtyRefreshCount = nil }
            Button(t(.refreshOverwrite), role: .destructive) {
                let root = vault.rootURL
                dirtyRefreshCount = nil
                if let root { performRefresh(root) }
            }
        } message: {
            Text(String(format: t(.refreshOverwriteBody), dirtyRefreshCount ?? 0))
        }
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
            GitHubOpenView(
                onOpen: {
                    openedFile = OpenedURL(url: $0.fileURL, readAccessRoot: $0.root, sourceLink: $0.link)
                },
                onOpenVault: { openRepoAsVault($0) })
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
                }, onOpenVault: { openRepoAsVault($0) })
                .navigationDestination(for: GitHubLink.self) { child in
                    GitHubBrowseView(link: child, onOpenFile: { doc in
                        githubBrowse = nil
                        openedFile = OpenedURL(
                            url: doc.fileURL, readAccessRoot: doc.root, sourceLink: doc.link)
                    }, onOpenVault: { openRepoAsVault($0) })
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
                OnboardingView(
                    onOpenFolder: { showPicker = true },
                    onOpenGitHub: { showGitHub = true })
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
                    // Only GitHub-backed vaults can be refreshed (Files/iCloud sync via the OS).
                    if vault.isGitHubVault {
                        Button { refreshGitHubVault() } label: {
                            Label(t(.refreshFromGitHub), systemImage: "arrow.clockwise")
                        }
                        .disabled(refreshingVault)
                    }
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
