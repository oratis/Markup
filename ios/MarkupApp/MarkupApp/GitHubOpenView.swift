import SwiftUI
import MarkupKit

/// Paste a GitHub file link and open it in the reader. Public repos need no
/// sign-in; the fetched file is rendered (and added to Recents) like any other
/// shared file.
struct GitHubOpenView: View {
    var onOpen: (URL) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var urlText = ""
    @State private var loading = false
    @State private var error: String?
    @State private var path = NavigationPath()
    @State private var showSignIn = false
    private let auth = GitHubAuth.shared

    var body: some View {
        NavigationStack(path: $path) {
            Form {
                if auth.isSignedIn {
                    Section {
                        HStack {
                            Label(t(.githubSignedIn), systemImage: "checkmark.seal.fill")
                                .foregroundStyle(.green)
                            Spacer()
                            Button(t(.githubSignOut), role: .destructive) { auth.signOut() }
                        }
                    }
                } else if auth.isConfigured {
                    Section {
                        Button { showSignIn = true } label: {
                            Label(t(.githubSignIn), systemImage: "person.crop.circle.badge.plus")
                        }
                    }
                }

                Section {
                    TextField(t(.githubUrlPrompt), text: $urlText, axis: .vertical)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .font(.callout)
                    if let error {
                        Text(error).foregroundStyle(.red).font(.caption)
                    }
                } footer: {
                    Text("e.g. github.com/owner/repo/blob/main/README.md")
                }

                Section {
                    Button {
                        Task { await open() }
                    } label: {
                        HStack {
                            if loading { ProgressView().controlSize(.small) }
                            Text(t(.open))
                        }
                    }
                    .disabled(urlText.trimmingCharacters(in: .whitespaces).isEmpty || loading)
                }
            }
            .navigationTitle(t(.openFromGitHub))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.cancel)) { dismiss() } } }
            .navigationDestination(for: GitHubLink.self) { link in
                GitHubBrowseView(link: link, onOpenFile: { url in onOpen(url); dismiss() })
            }
            .sheet(isPresented: $showSignIn) { GitHubSignInView() }
        }
    }

    private func open() async {
        error = nil
        guard let link = GitHubLinkParser.parse(urlText) else {
            error = t(.githubInvalid)
            return
        }
        // A repo / folder link → browse it; a file link → open it.
        if link.isDirectory {
            path.append(link)
            return
        }
        loading = true
        defer { loading = false }
        do {
            let fileURL = try await GitHubService.shared.openFile(link)
            onOpen(fileURL)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
