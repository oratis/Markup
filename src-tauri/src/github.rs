//! GitHub OAuth Device Flow token exchange.
//!
//! The `github.com/login/*` endpoints don't send CORS headers, so the webview
//! can't call them directly — these commands run the HTTP from Rust and return
//! the raw JSON, which the frontend parses (mirroring the Swift/TS device-flow
//! parsers). No client secret is involved (device flow is a public client).

use serde_json::Value;

const DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const TOKEN_URL: &str = "https://github.com/login/oauth/access_token";

async fn post_form(url: &str, params: &[(&str, &str)]) -> Result<Value, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .header("Accept", "application/json")
        .header("User-Agent", "Markup")
        .form(params)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    resp.json::<Value>().await.map_err(|e| e.to_string())
}

/// Start the device flow: returns `{ device_code, user_code, verification_uri,
/// expires_in, interval }`.
#[tauri::command]
pub async fn github_device_start(client_id: String) -> Result<Value, String> {
    post_form(
        DEVICE_CODE_URL,
        &[("client_id", &client_id), ("scope", "repo")],
    )
    .await
}

/// Poll the token endpoint: returns `{ access_token, … }` once authorized, or
/// `{ error: "authorization_pending" | "slow_down" | … }` meanwhile.
#[tauri::command]
pub async fn github_device_poll(client_id: String, device_code: String) -> Result<Value, String> {
    post_form(
        TOKEN_URL,
        &[
            ("client_id", &client_id),
            ("device_code", &device_code),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ],
    )
    .await
}
