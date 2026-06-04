import SwiftUI
import UIKit
import MarkupKit

/// GitHub OAuth Device Flow: shows the user code + a link to github.com/login/
/// device, then polls until the user authorizes (or it fails). Dismisses on
/// success. Only reachable when a Client ID is configured.
struct GitHubSignInView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var code: GitHubDeviceCode?
    @State private var error: String?
    @State private var waiting = true
    private let auth = GitHubAuth.shared

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                if let code {
                    Image(systemName: "person.badge.key")
                        .font(.system(size: 40)).foregroundStyle(.tint)
                    Text(t(.githubEnterCode)).font(.callout).foregroundStyle(.secondary)
                    Text(code.userCode)
                        .font(.system(.largeTitle, design: .monospaced).bold())
                        .textSelection(.enabled)
                    Button(t(.copyCode)) { UIPasteboard.general.string = code.userCode }
                        .buttonStyle(.bordered)
                    if let url = URL(string: code.verificationURI) {
                        Link(t(.githubSignIn), destination: url)
                            .buttonStyle(.borderedProminent)
                    }
                    if waiting {
                        ProgressView(t(.githubWaiting)).padding(.top, 8)
                    }
                } else if let error {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 36)).foregroundStyle(.secondary)
                    Text(error).multilineTextAlignment(.center).foregroundStyle(.red)
                } else {
                    ProgressView()
                }
            }
            .padding(32)
            .navigationTitle(t(.githubSignIn))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.cancel)) { dismiss() } } }
            .task { await run() }
        }
    }

    private func run() async {
        do {
            let c = try await auth.startDeviceCode()
            code = c
            try await auth.pollForToken(c)
            dismiss()
        } catch {
            self.error = error.localizedDescription
            waiting = false
        }
    }
}
