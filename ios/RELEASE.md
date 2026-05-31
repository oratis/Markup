# Shipping Markup iOS to TestFlight

> **Important context.** Markup iOS is a **native SwiftUI Xcode app**, not an Expo/React
> Native app. EAS's *standard* build (what `luddi` uses) only builds Expo/RN projects, so it
> can't build this directly. Two working paths below — both produce a TestFlight build with
> **Expo/EAS-managed credentials** (an App Store Connect API key stored as a secret).

Bundle id: **`com.appkon.markup.ios`** · Team/credentials: your Apple Developer account.

---

## What you must do once (either path)

1. **Apple Developer Program** membership ($99/yr) — *required*; there is no TestFlight without it.
   Nothing (EAS/Expo included) can substitute for this.
2. **Register the app** in [App Store Connect](https://appstoreconnect.apple.com) → Apps → **+** →
   bundle id `com.appkon.markup.ios`, name "Markup".
3. **Create an App Store Connect API key**: App Store Connect → **Users and Access** →
   **Integrations** → **App Store Connect API** → generate a key with the **App Manager** role.
   Download the `.p8` (you can only download it once). Note the **Key ID** and **Issuer ID**.
4. Find your **Team ID**: Apple Developer → Membership (10 chars, e.g. `AB12CD34EF`).

That's it — the API key is the only credential needed. No certificates/profiles to juggle
(`-allowProvisioningUpdates` creates them automatically).

---

## Path A — EAS (your preference; Expo-managed credentials)

EAS runs a **custom build** that archives the Xcode project on an EAS macOS worker, signs with
your API key, and uploads to TestFlight. Config: [`eas.json`](./eas.json),
[`app.json`](./app.json), [`.eas/build/production.yml`](./.eas/build/production.yml).

```bash
cd ios
eas login                       # account: hakkoai
eas init                        # creates the EAS project; writes the real projectId into app.json
                                # (replace "REPLACE_AFTER_eas_init")

# Store the credentials as EAS secrets (Expo-managed):
eas secret:create --scope project --name ASC_KEY_ID    --value "ABCD1234EF"
eas secret:create --scope project --name ASC_ISSUER_ID --value "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
eas secret:create --scope project --name APPLE_TEAM_ID --value "AB12CD34EF"
eas secret:create --scope project --name ASC_KEY_BASE64 --value "$(base64 -i /path/AuthKey_ABCD1234EF.p8)"

# Build + upload to TestFlight:
eas build --platform ios --profile production
```

> ⚠️ **Honesty caveat.** I built and verified everything I can locally (`swift test`, simulator
> compile), but **I can't run EAS here** — native-app-on-EAS-custom-build is the less-trodden path,
> so the first `eas build` may need a tweak (e.g. an env-var name or a worker path). **Paste me the
> first build log and I'll fix the YAML.** If you'd rather not iterate, use Path B (it's faster and
> I can largely verify it).

---

## Path B — Local archive on your Mac (fastest today, most reliable)

You already have Xcode 26 on this Mac. One command does archive → export → TestFlight upload using
the same API key:

```bash
export ASC_KEY_ID=ABCD1234EF
export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export APPLE_TEAM_ID=AB12CD34EF
export ASC_KEY_PATH=/absolute/path/AuthKey_ABCD1234EF.p8

ios/scripts/archive-and-upload.sh
```

Then open **App Store Connect → TestFlight**, add yourself as an internal tester, and install via
the TestFlight app. (Script: [`scripts/archive-and-upload.sh`](./scripts/archive-and-upload.sh);
export config: [`MarkupApp/ExportOptions.plist`](./MarkupApp/ExportOptions.plist).)

---

## Recommendation

- **Want it on your phone today?** Run **Path B** — give me nothing, just run it with your key.
- **Want the EAS pipeline you asked for?** Run **Path A**; send me the first log if it trips, and
  I'll iterate the `production.yml`.

Both end at the same place: a TestFlight build signed with your Expo/EAS-stored API key.

## Notes
- Privacy: the app ships a `PrivacyInfo.xcprivacy` (no tracking, no data collected, declares the
  UserDefaults + file-timestamp "required reason" APIs) — App Store privacy label = **Data Not Collected**.
- Versioning: bump `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in the Xcode target for each
  TestFlight build (or pass `CURRENT_PROJECT_VERSION=N` to xcodebuild).
