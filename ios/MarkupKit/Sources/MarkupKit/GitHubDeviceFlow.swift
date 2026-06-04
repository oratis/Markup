import Foundation

/// The device-code response that starts GitHub's OAuth Device Flow.
public struct GitHubDeviceCode: Equatable, Sendable {
    public var deviceCode: String
    public var userCode: String
    public var verificationURI: String
    public var interval: Int
    public var expiresIn: Int

    public init(
        deviceCode: String, userCode: String, verificationURI: String,
        interval: Int = 5, expiresIn: Int = 900
    ) {
        self.deviceCode = deviceCode
        self.userCode = userCode
        self.verificationURI = verificationURI
        self.interval = interval
        self.expiresIn = expiresIn
    }
}

/// The result of polling the access-token endpoint during device flow.
public enum GitHubPollOutcome: Equatable, Sendable {
    case authorized(token: String)
    case pending
    case slowDown
    case denied
    case expired
    case failed(String)
}

/// Pure parsing of GitHub OAuth Device Flow responses (the network calls live
/// in the app; this is the error-prone, testable part).
public enum GitHubDeviceFlow {
    /// The device/authorize start URL.
    public static let deviceCodeURL = "https://github.com/login/device/code"
    /// The token-poll URL.
    public static let tokenURL = "https://github.com/login/oauth/access_token"

    public static func parseDeviceCode(_ data: Data) -> GitHubDeviceCode? {
        guard let o = json(data) else { return nil }
        guard let device = o["device_code"] as? String,
              let user = o["user_code"] as? String,
              let verify = o["verification_uri"] as? String else { return nil }
        return GitHubDeviceCode(
            deviceCode: device, userCode: user, verificationURI: verify,
            interval: (o["interval"] as? Int) ?? 5,
            expiresIn: (o["expires_in"] as? Int) ?? 900)
    }

    public static func parsePoll(_ data: Data) -> GitHubPollOutcome {
        guard let o = json(data) else { return .failed("Bad response") }
        if let token = o["access_token"] as? String, !token.isEmpty {
            return .authorized(token: token)
        }
        switch o["error"] as? String {
        case "authorization_pending": return .pending
        case "slow_down": return .slowDown
        case "access_denied": return .denied
        case "expired_token": return .expired
        case let other?: return .failed(other)
        case nil: return .failed("Unknown response")
        }
    }

    private static func json(_ data: Data) -> [String: Any]? {
        (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }
}
