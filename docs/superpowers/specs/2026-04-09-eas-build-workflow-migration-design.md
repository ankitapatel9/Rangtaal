# EAS Build Workflow Migration — Design

> **Author:** brainstorming session 2026-04-09
> **Status:** approved by user, ready for implementation plan
> **Scope:** developer workflow only — zero application code changes

## Context

Rangtaal uses `@react-native-firebase/auth` and `@react-native-firebase/firestore` (the native Firebase SDKs), which forces the project out of Expo Go and into a custom dev client built from native code. Building the native binary locally on the developer's Mac has become a fragile chain of stacked workarounds:

1. `@react-native-firebase` requires `RCTBridgeModule` to be exposed as a modular header. Expo's prebuilt React Native pods don't expose it (expo/expo#39233), so `app.config.js` sets `ios.buildReactNativeFromSource: true` via `expo-build-properties`.
2. Building React Native from source forces CocoaPods to compile `fmt 11.0.2`, the formatting library RN vendors via `node_modules/react-native/third-party-podspecs/fmt.podspec`.
3. `fmt 11.0.2`'s consteval-detection chain in `include/fmt/base.h:114-132` only guards against Apple Clang **< 14**. Apple Clang **21** (Xcode 26+) tightened consteval semantics and rejects every `FMT_STRING(...)` call inside `format-inl.h` with "call to consteval function ... is not a constant expression". 5 errors at lines 59, 60, 1387, 1391, 1394 are the signature.
4. Even after patching `fmt/base.h` (via a Podfile post_install hook that neuters `FMT_CONSTEVAL` to an empty define), Expo CLI's `run:ios --device` install path has a codesign race: it transfers the `.app` to the device before xcodebuild's signing step has finalized, the device rejects an unsigned bundle silently, and Expo prints "Complete 100%" anyway. Then the dev client launches without a Metro URL and shows "no development server found".
5. Even after that, Metro lives on a LAN address that may not be reachable from the phone (Mac on Ethernet vs phone on Wi-Fi, router AP isolation, Tailscale identity confusion, etc.).

Each problem is individually solvable. Together they make first-time setup cost 4+ hours and turn every clean rebuild into a debugging session. The user's frustration is justified.

## Goal

Make daily Rangtaal development feel like Expo Go — `npm start`, edit code, see it on the phone within a second — while keeping `@react-native-firebase` (so phone auth, native Firestore, and other native features keep working). The native binary becomes a "build once via EAS Build, install once on the phone, forget" artifact, produced in the cloud where the build environment is reproducible and the developer machine is irrelevant.

## Non-goals

- **Not** migrating to the Firebase JS SDK. Phone auth via the native iOS SDK is the cleanest UX and is already wired up. The JS SDK's `RecaptchaVerifier` requirement adds friction in React Native (deprecated `expo-firebase-recaptcha`, custom WebView wrappers).
- **Not** changing any app code (`app/`, `src/`, `__tests__/`). Same imports, same files, same behavior.
- **Not** writing an Expo config plugin for the fmt patch. Pinning EAS Build's Xcode version achieves the same result with one line of config and zero additional code.
- **Not** touching Android. Android wasn't built locally, isn't blocking, and the same EAS Build approach extends trivially when needed.
- **Not** addressing Phase 2 (Class & Schedule). That's downstream future work and is unaffected by this migration.
- **Not** committing changes to git automatically. The implementation will leave changes uncommitted on a new branch for explicit review.

## Architecture

The architecture splits development into **two distinct loops**, each fast in its own way:

### Loop 1: JavaScript loop (hot path, runs hundreds of times per day)

```
edit code → save → Metro recompiles → tunnel pushes diff → fast refresh
```

- `npm start` runs `expo start --tunnel`. Tunnel mode routes traffic via Expo's ngrok-backed relay, so the URL is reachable from the phone regardless of LAN topology, firewall state, or Wi-Fi vs Ethernet asymmetry.
- The phone runs the **dev client** (a custom Rangtaal binary built once via EAS Build, installed once via `eas build:run`). The dev client connects to Metro via the tunnel URL, downloads the JS bundle, and renders the app.
- Saving any file under `app/` or `src/` triggers Metro to recompile only the changed module, push the diff over the tunnel, and trigger React Native fast refresh on the device. End-to-end latency is sub-second under good network conditions.

### Loop 2: Native loop (cold path, runs once per native dependency change)

```
add native dep → eas build → eas build:run → install on phone
```

- `eas build --profile development --platform ios` runs in EAS's cloud infrastructure on a pinned Xcode 16.4 image. The cloud runs `expo prebuild` from a clean state, runs `pod install`, runs `xcodebuild`, signs with EAS-managed Apple Development credentials, and produces a `.ipa`.
- `eas build:run --latest --platform ios` installs the latest successful build on the connected iPhone. No local Xcode, no local CocoaPods, no codesign race.
- This loop only runs when something *native* changes: a new package with native code, an Expo SDK upgrade, an RN Firebase upgrade, a config plugin change. Typical frequency: weekly or monthly, not daily.

### Why pin Xcode 16.4

EAS Build's default iOS image (`macos-sequoia-15.6-xcode-26.2`) ships Xcode 26.2 with Apple Clang 21.x — the same compiler family that triggers the fmt consteval bug locally. A default EAS build will fail in the cloud the same way local builds fail.

Xcode 16.4 (`macos-sequoia-15.6-xcode-16.4`) ships an older Apple Clang that predates the consteval tightening introduced in Xcode 26's compiler. fmt 11.0.2 compiles cleanly on it. RN 0.81.5 was released targeting Xcode 16, so this is the matched-pair combination — not an unsupported downgrade.

The cost of pinning is being unable to use Xcode 26-only iOS APIs in cloud builds. Rangtaal targets iOS 15.1 and uses no Xcode 26-specific features, so this cost is zero today. The pin is revisitable when fmt or RN ships a fix.

## File-level changes

### Edited

- **`eas.json`** — add `"ios": { "image": "macos-sequoia-15.6-xcode-16.4" }` to each of the three build profiles (`development`, `preview`, `production`). The `cli` and `submit` sections are unchanged.
- **`package.json`** — update the `scripts` section:
  - `"start": "expo start --tunnel"` (was `"expo start"`)
  - `"ios": "eas build --profile development --platform ios && eas build:run --latest --platform ios"` (was `"expo run:ios"`)
  - `"android": "eas build --profile development --platform android && eas build:run --latest --platform android"` (was `"expo run:android"`)
  - Add `"build:dev": "eas build --profile development --platform ios"` as an explicit form
  - Keep `"web"`, `"test"`, `"test:watch"` exactly as they are
- **`app.config.js`** — **no changes**. The `expo-build-properties` plugin with `buildReactNativeFromSource: true` stays (still needed for the RN Firebase modulemap issue, which is unrelated to Xcode version). The URL scheme array workaround stays. The `googleServicesFile` paths reading from env vars stay.

### Deleted (locally only — gitignored, no source-control impact)

- **`ios/`** — the entire generated folder. Removes the manual Podfile patch (no longer reachable since we'll never `pod install` locally), wipes the half-baked codesign state from the failed local build attempts, and ensures the next `eas build` does a clean prebuild in the cloud.
- **`.eas/.env/`** — the local copy of file env vars from `eas env:pull`. EAS Build reads these directly from the cloud env in the build container, doesn't need a local copy.
- **`.env.local`** — the file pointer to the above. No longer needed.

### Created

- **`docs/development.md`** — short (~50 line) "how to develop on Rangtaal" guide. Covers: the two loops, exact commands for each, where to look when something breaks, the credential setup for first-time EAS Build, and a "do not run `expo run:ios` locally" warning explaining why. This document is the durable answer to "how do we make this easy" — future-developers (or future-self) read it once and are set up correctly.
- **A memory entry update** to `~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/project_ios_build_workarounds.md` reflecting the new reality: local builds are no longer the daily path, EAS Build with pinned Xcode 16.4 is. The original workaround context stays as historical "why we pinned" documentation.

### Untouched

- All files under `app/` (no app code changes)
- All files under `src/` (no source changes — `auth.ts`, `useAuth.ts`, `useUser.ts`, `users.ts`, `welcome.tsx`, `login.tsx`, `verify.tsx` all keep their `@react-native-firebase` imports verbatim)
- All files under `__tests__/` (no test changes — same Jest mocks, same assertions)
- `firebase.json`, `firestore.rules`, `firestore.indexes.json`
- `tsconfig.json`, `jest.config.js`, `jest.setup.ts`
- `package-lock.json` (no dependency add or remove, no `npm install` needed)
- The Phase 1 plan and Phase 2 plan in `docs/superpowers/plans/`

## Daily workflow after migration

**Start of session:**

```
npm start
```

Runs `expo start --tunnel`. Wait ~10 seconds for Metro to print the QR code and the `exp+rangtaal://` URL. Tunnel mode means the URL is reachable from anywhere — the phone on Wi-Fi, on cellular, on a different network entirely.

**Connecting the phone (once per fresh dev client install):**

1. Open the Camera app on the iPhone.
2. Point it at the QR code in the terminal.
3. Tap the yellow notification banner.
4. The Rangtaal dev client opens with the right Metro URL baked in.
5. The dev client remembers it. Subsequent launches from the home screen auto-connect to the last-known dev server.

**Editing code (the whole point):**

- Save any file in `app/` or `src/`.
- Metro recompiles the changed module (~50ms).
- Tunnel pushes the diff to the phone (~100-300ms).
- Fast refresh applies it without losing component state.
- Total: under half a second from save to seeing the change.

**When a native dependency changes** (rare — a new package with native code, an Expo SDK upgrade, an RN Firebase upgrade):

```
npm run build:dev
```

Kicks off `eas build --profile development --platform ios`. Cloud builds typically take 10-15 minutes. The developer keeps coding on JS in another window while it runs.

```
eas build:run --latest --platform ios
```

Installs the new dev client on the connected iPhone. Takes ~1 minute. Then back to the JavaScript loop.

## Acceptance criteria

The migration is complete and successful when **all** of these are true:

1. **`npm start` runs cleanly** — no errors, prints a tunnel URL, shows the QR code, no port conflicts.
2. **`npm run build:dev` produces a successful EAS Build** of the development profile. The build log on EAS's web UI shows green. The fmt errors do NOT appear.
3. **The resulting `.ipa` installs on the iPhone via `eas build:run --latest --platform ios`** — no codesign errors, the Rangtaal icon appears on the home screen.
4. **Tapping the Rangtaal icon launches the app**: white splash with Rangtaal icon (not black), JS bundle loads via the tunnel, lands on the login screen (the auth gate in `app/_layout.tsx:22-23` redirects unauthed users to `/(auth)/login`).
5. **Phone auth flow loads** — typing a phone number and tapping Send OTP transitions to `verify.tsx` without crashing. SMS delivery is out of scope (depends on Firebase Auth phone provider configuration, which is the user's domain).
6. **Editing `app/(auth)/login.tsx`** (e.g., changing the title text) and saving — the change appears on the phone within a couple seconds via fast refresh.
7. **`npm test` still passes** — the existing 4 test files all pass unchanged (no app code changed, no test mocks changed).
8. **The repo has no `ios/` folder** at the end of the migration (gitignored and absent locally).
9. **`docs/development.md` exists** and contains the workflow above.
10. **The memory entry is updated** to reflect the new reality.

## Risks and mitigations

- **Risk: Xcode 16.4 cloud build hits a different compatibility issue with `react-native@0.81.5` + new arch + Firebase.** Probability: low. RN 0.81 was released targeting Xcode 16. Mitigation: if the cloud build fails for a different reason, capture the EAS build log, diagnose against a clean environment, either bump to a slightly newer Xcode 16 image or write the fmt config plugin as fallback.
- **Risk: First EAS Build credential setup fails.** The `eas build` first run is interactive — it prompts for Apple ID credentials and asks to set up a development cert + provisioning profile. If the Apple ID has quirks (no team selected, expired cert, etc.), this can fail. Mitigation: the prompt is interactive and can be answered in real time. Same Apple team as the local builds (`G8UYR68V26`), so the account is already known to work.
- **Risk: Tunnel mode is slow or flaky due to ngrok issues.** Probability: low — Expo's tunnel infrastructure is reliable. Fallback: `expo start --lan` and use the Tailscale IP `100.105.140.45` we identified during the brainstorming session. Documented in `docs/development.md`.
- **Risk: Phone auth needs the iOS reCAPTCHA URL scheme handling currently in `app.config.js`.** That stays exactly as-is. Cloud builds will pick it up via `app.config.js`. No regression.
- **Risk: The codesign race that bit `expo run:ios` also bites `eas build`.** No — that race is in Expo CLI's local install path, not in EAS Build. EAS Build uses xcodebuild's archive flow with explicit codesigning, which doesn't have the race.
- **Risk: Test files import `@react-native-firebase/*` and break.** The existing tests should pass unchanged because no source files change. Will verify by running `npm test` as part of acceptance.

## Out of scope (deliberate omissions)

- **Expo config plugin** for the fmt patch. The Xcode pin makes it unnecessary; the plugin is defensive engineering for a problem we no longer have.
- **App code changes**, refactors, or improvements. This migration is workflow-only.
- **Test additions or removals**.
- **Phase 2 (Class & Schedule)**.
- **Android**.
- **Auto-committing changes**. Implementation leaves a branch with uncommitted (or branch-only) changes for explicit review.
- **CI integration** (auto-build on PR, etc.). Future work if/when CI is added.

## Implementation sequence (high level)

The detailed implementation plan will be authored separately by the `superpowers:writing-plans` skill after this spec is approved. The high-level sequence is:

1. Create branch `eas-build-workflow-migration` off `phase-1-foundation`.
2. Edit `eas.json` to pin Xcode 16.4 in all three profiles.
3. Edit `package.json` scripts.
4. Create `docs/development.md` with the daily workflow.
5. Delete local `ios/`, `.eas/.env/`, `.env.local`.
6. Update memory entry.
7. Run acceptance criteria 1, 7 (commands that don't require EAS or device).
8. Hand back uncommitted changes for user review.
9. User runs `npm run build:dev` (interactive credentials), `eas build:run`, then steps 3-6 of acceptance criteria.
10. User runs steps 8-10 (verification of file deletions and doc creation).
11. User commits and merges when satisfied.
