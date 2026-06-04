import Foundation
import Testing
@testable import MarkupKit

@Suite("GitHubDeviceFlow")
struct GitHubDeviceFlowTests {
    @Test func parsesDeviceCode() {
        let json = Data("""
        {"device_code":"dc","user_code":"WDJB-MJHT",
         "verification_uri":"https://github.com/login/device",
         "expires_in":900,"interval":5}
        """.utf8)
        #expect(GitHubDeviceFlow.parseDeviceCode(json) == GitHubDeviceCode(
            deviceCode: "dc", userCode: "WDJB-MJHT",
            verificationURI: "https://github.com/login/device", interval: 5, expiresIn: 900))
    }

    @Test func deviceCodeUsesDefaults() {
        let json = Data("""
        {"device_code":"d","user_code":"U","verification_uri":"v"}
        """.utf8)
        let c = GitHubDeviceFlow.parseDeviceCode(json)
        #expect(c?.interval == 5)
        #expect(c?.expiresIn == 900)
    }

    @Test func parsesAuthorizedToken() {
        let json = Data(#"{"access_token":"gho_abc","token_type":"bearer","scope":"repo"}"#.utf8)
        #expect(GitHubDeviceFlow.parsePoll(json) == .authorized(token: "gho_abc"))
    }

    @Test func mapsPollErrors() {
        func outcome(_ err: String) -> GitHubPollOutcome {
            GitHubDeviceFlow.parsePoll(Data(#"{"error":"\#(err)"}"#.utf8))
        }
        #expect(outcome("authorization_pending") == .pending)
        #expect(outcome("slow_down") == .slowDown)
        #expect(outcome("access_denied") == .denied)
        #expect(outcome("expired_token") == .expired)
        #expect(outcome("unsupported_grant_type") == .failed("unsupported_grant_type"))
    }

    @Test func badJSONFails() {
        #expect(GitHubDeviceFlow.parseDeviceCode(Data("nope".utf8)) == nil)
        if case .failed = GitHubDeviceFlow.parsePoll(Data("nope".utf8)) {} else {
            Issue.record("expected .failed for bad JSON")
        }
    }
}
