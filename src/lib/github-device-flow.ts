/**
 * Pure parsing of GitHub OAuth Device Flow responses, mirroring the Swift
 * `GitHubDeviceFlow` in MarkupKit so both platforms behave identically. The
 * network calls (which must go through Rust on desktop, since GitHub's token
 * endpoints don't send CORS headers) live elsewhere; this is the testable part.
 */

export const DEVICE_CODE_URL = "https://github.com/login/device/code";
export const TOKEN_URL = "https://github.com/login/oauth/access_token";

/** The device-code response that starts the flow. */
export interface GitHubDeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
}

/** The result of polling the token endpoint. */
export type GitHubPollOutcome =
  | { kind: "authorized"; token: string }
  | { kind: "pending" }
  | { kind: "slowDown" }
  | { kind: "denied" }
  | { kind: "expired" }
  | { kind: "failed"; message: string };

function asObject(json: unknown): Record<string, unknown> | null {
  return json && typeof json === "object" && !Array.isArray(json)
    ? (json as Record<string, unknown>)
    : null;
}

export function parseDeviceCode(json: unknown): GitHubDeviceCode | null {
  const o = asObject(json);
  if (!o) return null;
  const deviceCode = o.device_code;
  const userCode = o.user_code;
  const verificationUri = o.verification_uri;
  if (
    typeof deviceCode !== "string" ||
    typeof userCode !== "string" ||
    typeof verificationUri !== "string"
  ) {
    return null;
  }
  return {
    deviceCode,
    userCode,
    verificationUri,
    interval: typeof o.interval === "number" ? o.interval : 5,
    expiresIn: typeof o.expires_in === "number" ? o.expires_in : 900,
  };
}

export function parsePoll(json: unknown): GitHubPollOutcome {
  const o = asObject(json);
  if (!o) return { kind: "failed", message: "Bad response" };
  if (typeof o.access_token === "string" && o.access_token !== "") {
    return { kind: "authorized", token: o.access_token };
  }
  switch (o.error) {
    case "authorization_pending":
      return { kind: "pending" };
    case "slow_down":
      return { kind: "slowDown" };
    case "access_denied":
      return { kind: "denied" };
    case "expired_token":
      return { kind: "expired" };
    case undefined:
      return { kind: "failed", message: "Unknown response" };
    default:
      return { kind: "failed", message: String(o.error) };
  }
}
