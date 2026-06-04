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

    var body: some View {
        NavigationStack {
            Form {
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
        }
    }

    private func open() async {
        error = nil
        guard let link = GitHubLinkParser.parse(urlText) else {
            error = t(.githubInvalid)
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
