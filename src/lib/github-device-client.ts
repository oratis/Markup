/**
 * Drives the GitHub OAuth Device Flow from the desktop frontend. The HTTP to
 * GitHub's token endpoints runs in Rust (they don't send CORS headers); this
 * wraps those `invoke` calls with the pure parsers in `github-device-flow.ts`
 * and the token storage in `github-auth.ts`.
 */
import { invoke } from "@tauri-apps/api/core";
import { GITHUB_CLIENT_ID, setGitHubToken } from "./github-auth";
import {
  type GitHubDeviceCode,
  type GitHubPollOutcome,
  parseDeviceCode,
  parsePoll,
} from "./github-device-flow";

/** Begin the flow: ask GitHub for a device + user code. */
export async function startDeviceFlow(): Promise<GitHubDeviceCode> {
  const json = await invoke("github_device_start", { clientId: GITHUB_CLIENT_ID });
  const code = parseDeviceCode(json);
  if (!code) throw new Error("GitHub didn't return a device code.");
  return code;
}

/** Poll once for the access token. */
export async function pollDeviceFlow(deviceCode: string): Promise<GitHubPollOutcome> {
  try {
    const json = await invoke("github_device_poll", {
      clientId: GITHUB_CLIENT_ID,
      deviceCode,
    });
    return parsePoll(json);
  } catch (e) {
    return { kind: "failed", message: String(e) };
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Poll until authorized, denied, expired, or `signal` aborts. On success the
 * token is persisted via `setGitHubToken` and returned. Honours `slow_down`.
 */
export async function awaitDeviceToken(
  code: GitHubDeviceCode,
  signal?: AbortSignal,
): Promise<GitHubPollOutcome> {
  let intervalMs = Math.max(code.interval, 1) * 1000;
  const deadline = Date.now() + code.expiresIn * 1000;
  while (Date.now() < deadline) {
    if (signal?.aborted) return { kind: "failed", message: "Cancelled" };
    await delay(intervalMs);
    const outcome = await pollDeviceFlow(code.deviceCode);
    switch (outcome.kind) {
      case "authorized":
        setGitHubToken(outcome.token);
        return outcome;
      case "pending":
        break;
      case "slowDown":
        intervalMs += 5000;
        break;
      default:
        return outcome;
    }
  }
  return { kind: "expired" };
}
