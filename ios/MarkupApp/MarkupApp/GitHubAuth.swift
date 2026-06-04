import Foundation
import MarkupKit
import Security

/// Tiny Keychain string store (for the GitHub token).
enum Keychain {
    private static let service = "markup.github"

    static func set(_ value: String?, account: String) {
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(base as CFDictionary)
        guard let value, let data = value.data(using: .utf8) else { return }
        var add = base
        add[kSecValueData as String] = data
        SecItemAdd(add as CFDictionary, nil)
    }

    static func get(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
        ]
        var out: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
}

/// GitHub OAuth via Device Flow. Holds the token (Keychain-backed).
///
/// ⚠️ Set `clientID` to a registered GitHub OAuth App's Client ID with
/// **Device Flow enabled** (github.com → Settings → Developer settings →
/// OAuth Apps). While it's empty, sign-in is disabled and only public repos
/// work — everything else degrades gracefully.
@MainActor
@Observable
final class GitHubAuth {
    static let shared = GitHubAuth()

    /// TODO: paste the OAuth App Client ID here to enable private-repo sign-in.
    static let clientID = ""

    private let account = "token"
    var token: String?

    init() { token = Keychain.get(account: account) }

    var isConfigured: Bool { !Self.clientID.isEmpty }
    var isSignedIn: Bool { token != nil }

    func signOut() {
        token = nil
        Keychain.set(nil, account: account)
    }

    enum AuthError: LocalizedError {
        case notConfigured, startFailed, denied, expired, failed(String)
        var errorDescription: String? {
            switch self {
            case .notConfigured: return "GitHub sign-in isn't configured in this build."
            case .startFailed: return "Couldn't start GitHub sign-in."
            case .denied: return "Sign-in was denied."
            case .expired: return "The sign-in code expired — try again."
            case .failed(let m): return "GitHub sign-in failed (\(m))."
            }
        }
    }

    /// Step 1: request a device + user code to show the user.
    func startDeviceCode(scope: String = "repo") async throws -> GitHubDeviceCode {
        guard isConfigured else { throw AuthError.notConfigured }
        let body = "client_id=\(Self.clientID)&scope=\(scope)"
        let data = try await post(GitHubDeviceFlow.deviceCodeURL, body: body)
        guard let code = GitHubDeviceFlow.parseDeviceCode(data) else { throw AuthError.startFailed }
        return code
    }

    /// Step 2: poll until the user authorizes (or it's denied/expires). On
    /// success the token is stored and returned.
    @discardableResult
    func pollForToken(_ code: GitHubDeviceCode) async throws -> String {
        var interval = max(1, code.interval)
        let deadline = Date().addingTimeInterval(TimeInterval(code.expiresIn))
        let body = "client_id=\(Self.clientID)&device_code=\(code.deviceCode)"
            + "&grant_type=urn:ietf:params:oauth:grant-type:device_code"
        while Date() < deadline {
            try await Task.sleep(nanoseconds: UInt64(interval) * 1_000_000_000)
            let data = try await post(GitHubDeviceFlow.tokenURL, body: body)
            switch GitHubDeviceFlow.parsePoll(data) {
            case .authorized(let t):
                token = t
                Keychain.set(t, account: account)
                return t
            case .pending: continue
            case .slowDown: interval += 5
            case .denied: throw AuthError.denied
            case .expired: throw AuthError.expired
            case .failed(let m): throw AuthError.failed(m)
            }
        }
        throw AuthError.expired
    }

    private func post(_ url: String, body: String) async throws -> Data {
        var req = URLRequest(url: URL(string: url)!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = body.data(using: .utf8)
        let (data, _) = try await URLSession.shared.data(for: req)
        return data
    }
}
