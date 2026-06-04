import { describe, expect, it } from "vitest";
import { parseDeviceCode, parsePoll } from "./github-device-flow";

describe("parseDeviceCode", () => {
  it("parses a full response", () => {
    expect(
      parseDeviceCode({
        device_code: "dc",
        user_code: "WDJB-MJHT",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 5,
      }),
    ).toEqual({
      deviceCode: "dc",
      userCode: "WDJB-MJHT",
      verificationUri: "https://github.com/login/device",
      interval: 5,
      expiresIn: 900,
    });
  });

  it("defaults interval and expiry", () => {
    const c = parseDeviceCode({
      device_code: "d",
      user_code: "U",
      verification_uri: "v",
    });
    expect(c?.interval).toBe(5);
    expect(c?.expiresIn).toBe(900);
  });

  it("returns null for malformed input", () => {
    expect(parseDeviceCode({ device_code: "d" })).toBeNull();
    expect(parseDeviceCode("nope")).toBeNull();
    expect(parseDeviceCode(null)).toBeNull();
  });
});

describe("parsePoll", () => {
  it("returns the token when authorized", () => {
    expect(parsePoll({ access_token: "gho_abc", token_type: "bearer" })).toEqual({
      kind: "authorized",
      token: "gho_abc",
    });
  });

  it("maps the documented error states", () => {
    expect(parsePoll({ error: "authorization_pending" })).toEqual({ kind: "pending" });
    expect(parsePoll({ error: "slow_down" })).toEqual({ kind: "slowDown" });
    expect(parsePoll({ error: "access_denied" })).toEqual({ kind: "denied" });
    expect(parsePoll({ error: "expired_token" })).toEqual({ kind: "expired" });
    expect(parsePoll({ error: "unsupported_grant_type" })).toEqual({
      kind: "failed",
      message: "unsupported_grant_type",
    });
  });

  it("fails on empty token or bad JSON", () => {
    expect(parsePoll({ access_token: "" }).kind).toBe("failed");
    expect(parsePoll("nope").kind).toBe("failed");
  });
});
