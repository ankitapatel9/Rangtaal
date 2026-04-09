# EAS Build Workflow Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Rangtaal's iOS development workflow from local builds to EAS Build with pinned Xcode 16.4, making `npm start` + fast refresh the daily path and relegating native builds to a cloud "build once, install once" cadence.

**Architecture:** Two-loop development model — the JavaScript loop (`expo start --tunnel` → dev client on phone → fast refresh) runs hundreds of times per day; the native loop (`eas build --profile development --platform ios` → `eas build:run`) runs only when native dependencies change. Xcode 16.4 is pinned in `eas.json` to sidestep the Apple Clang 21 consteval incompatibility with fmt 11.0.2 that broke local builds. All app code, tests, and `app.config.js` are untouched.

**Tech Stack:** Expo SDK 54 · React Native 0.81.5 · expo-router 6 · @react-native-firebase 24 · EAS Build (pinned Xcode 16.4) · Expo CLI (`expo start --tunnel`) · expo-dev-client

**Reference spec:** `docs/superpowers/specs/2026-04-09-eas-build-workflow-migration-design.md`

---

## File Structure

**Edited (committed):**
- `eas.json` — add `"ios": { "image": "macos-sequoia-15.6-xcode-16.4" }` to the `development`, `preview`, and `production` profiles.
- `package.json` — rewrite the `scripts` block so `start` uses tunnel mode and `ios`/`android` route through EAS Build + install.

**Created (committed):**
- `docs/development.md` — ~50 line daily workflow guide covering both loops, credential setup, and the "do not run `expo run:ios` locally" warning.

**Deleted locally (not committed — all three paths are gitignored):**
- `ios/` — generated native project; removes the in-tree Podfile patch and codesign state from failed local build attempts.
- `.eas/.env/` — local copy of EAS file env vars pulled by `eas env:pull`.
- `.env.local` — pointer file referencing `.eas/.env/*`.

**Touched outside the repo:**
- `~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/project_ios_build_workarounds.md` — update body to reflect the new reality.
- `~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/MEMORY.md` — update the index line.

**Untouched:** everything under `app/`, `src/`, `__tests__/`, plus `app.config.js`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `tsconfig.json`, `jest.config.js`, `jest.setup.ts`, `package-lock.json`, and both existing plans in `docs/superpowers/plans/`.

---

## Task 1: Create the feature branch

**Files:**
- No files modified; branch created locally only.

- [ ] **Step 1: Confirm current branch is `phase-1-foundation` and working tree has no conflicting edits**

Run: `git branch --show-current && git status --short`

Expected output:
```
phase-1-foundation
?? .eas/
?? docs/superpowers/specs/2026-04-09-eas-build-workflow-migration-design.md
?? docs/superpowers/plans/2026-04-09-eas-build-workflow-migration.md
```

The two `??` entries (`.eas/`, the spec, this plan) are expected untracked files and will carry over to the new branch cleanly. If anything else appears, stop and ask the user before creating the branch.

- [ ] **Step 2: Create and switch to `eas-build-workflow-migration` branch off `phase-1-foundation`**

Run: `git checkout -b eas-build-workflow-migration`

Expected output: `Switched to a new branch 'eas-build-workflow-migration'`

- [ ] **Step 3: Verify branch switch succeeded**

Run: `git branch --show-current`

Expected output: `eas-build-workflow-migration`

No commit is made in this task — the branch exists only in the local checkout.

---

## Task 2: Pin Xcode 16.4 in `eas.json`

**Files:**
- Modify: `eas.json`

The spec requires every build profile to pin `macos-sequoia-15.6-xcode-16.4`. The current file has three profiles (`development`, `preview`, `production`) under `build`, each with zero `ios` key. We add an `ios.image` entry to each.

- [ ] **Step 1: Read the current `eas.json` to confirm baseline**

Run: `cat eas.json`

Expected content (verbatim):
```json
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

If the file differs, stop — someone else may have already started the migration.

- [ ] **Step 2: Rewrite `eas.json` with the pinned image in all three build profiles**

Replace the entire file contents with:

```json
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "image": "macos-sequoia-15.6-xcode-16.4"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "image": "macos-sequoia-15.6-xcode-16.4"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "image": "macos-sequoia-15.6-xcode-16.4"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Key points:
- The pin is on `build.<profile>.ios.image`, not `build.<profile>.image`. EAS Build reads the platform-scoped key and falls back to the unscoped key; the scoped form is the documented shape for per-platform images.
- `cli`, `submit`, and every non-`ios` property inside each profile are left exactly as they were.
- Trailing newline at EOF.

- [ ] **Step 3: Validate the file parses as JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('eas.json','utf8')); console.log('ok')"`

Expected output: `ok`

If the parser errors, fix the syntax before moving on. Do NOT edit `eas.json` by hand to the point where it no longer parses.

- [ ] **Step 4: Spot-check the pinned image is present on all three profiles**

Run: `node -e "const j=JSON.parse(require('fs').readFileSync('eas.json','utf8')); for (const p of ['development','preview','production']) { const img = j.build[p]?.ios?.image; if (img !== 'macos-sequoia-15.6-xcode-16.4') { console.error('MISSING pin on', p, '→', img); process.exit(1); } } console.log('all three profiles pinned');"`

Expected output: `all three profiles pinned`

- [ ] **Step 5: Commit**

```bash
git add eas.json
git commit -m "$(cat <<'EOF'
chore(eas): pin Xcode 16.4 image on all iOS build profiles

The default EAS Build iOS image ships Xcode 26 / Apple Clang 21,
which trips the same fmt 11.0.2 consteval incompatibility that
broke local builds (see memory/project_ios_build_workarounds.md).
Pinning macos-sequoia-15.6-xcode-16.4 gives us an older Apple Clang
that predates the consteval tightening; RN 0.81 was released
targeting Xcode 16, so this is the matched pair — not a downgrade.

Part of the EAS build workflow migration
(docs/superpowers/specs/2026-04-09-eas-build-workflow-migration-design.md).
EOF
)"
```

Expected: commit succeeds with no pre-commit hook failures (the repo has no hooks configured).

---

## Task 3: Rewrite `package.json` scripts for the two-loop workflow

**Files:**
- Modify: `package.json:5-12` (the `scripts` block)

Current scripts:
```json
"scripts": {
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "web": "expo start --web",
  "test": "NODE_OPTIONS=--experimental-vm-modules jest",
  "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch"
},
```

Target: `start` switches to tunnel mode; `ios`/`android` become the chained EAS build + install flow; `build:dev` is added as the explicit "just build, don't install" form. `web`, `test`, `test:watch` stay identical.

- [ ] **Step 1: Read `package.json` to confirm baseline**

Run: `cat package.json`

Confirm the `scripts` block matches the current scripts quoted above. If it differs, stop and inspect.

- [ ] **Step 2: Edit the `scripts` block**

Use the Edit tool to replace the existing `scripts` block with:

```json
  "scripts": {
    "start": "expo start --tunnel",
    "android": "eas build --profile development --platform android && eas build:run --latest --platform android",
    "ios": "eas build --profile development --platform ios && eas build:run --latest --platform ios",
    "build:dev": "eas build --profile development --platform ios",
    "web": "expo start --web",
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch"
  },
```

Preserve two-space indentation and the trailing comma after the closing `}` of `scripts` (the `dependencies` block follows it).

- [ ] **Step 3: Validate `package.json` still parses as JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('ok')"`

Expected output: `ok`

- [ ] **Step 4: Spot-check the new scripts are present and old ones are gone**

Run: `node -e "const j=JSON.parse(require('fs').readFileSync('package.json','utf8')); const s=j.scripts; const want={start:'expo start --tunnel', 'build:dev':'eas build --profile development --platform ios', ios:'eas build --profile development --platform ios && eas build:run --latest --platform ios', android:'eas build --profile development --platform android && eas build:run --latest --platform android'}; for (const [k,v] of Object.entries(want)) { if (s[k]!==v) { console.error('MISMATCH', k, '→', s[k]); process.exit(1); } } if (s.start==='expo start' || s.ios==='expo run:ios' || s.android==='expo run:android') { console.error('old scripts still present'); process.exit(1); } console.log('scripts ok');"`

Expected output: `scripts ok`

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "$(cat <<'EOF'
chore(scripts): route start through tunnel and ios/android through EAS Build

- start: expo start --tunnel (reachable regardless of LAN topology)
- ios/android: eas build + eas build:run (no local Xcode/CocoaPods)
- build:dev: explicit "just build" form for the rare native loop

Part of the EAS build workflow migration
(docs/superpowers/specs/2026-04-09-eas-build-workflow-migration-design.md).
EOF
)"
```

---

## Task 4: Write `docs/development.md`

**Files:**
- Create: `docs/development.md`

This is the durable answer to "how do I develop on Rangtaal". It has to be read-once-and-you-are-set-up. Target ~50 lines of substantive content (headings + prose + commands).

- [ ] **Step 1: Confirm `docs/development.md` does not already exist**

Run: `ls docs/development.md 2>&1`

Expected output: `ls: docs/development.md: No such file or directory`

If it exists, read it first and reconcile against the content below before overwriting.

- [ ] **Step 2: Create `docs/development.md` with the following contents**

```markdown
# Rangtaal Developer Workflow

Rangtaal uses native Firebase (`@react-native-firebase`), so it runs inside a
custom **dev client** — not Expo Go. The dev client is built once in the cloud
via EAS Build and installed on your phone. After that, daily work is pure
JavaScript with fast refresh.

## The two loops

### JavaScript loop — runs hundreds of times per day

```
npm start
```

Runs `expo start --tunnel`. Wait ~10 seconds for the QR code. Scan it with the
iPhone Camera app and tap the yellow notification; the dev client opens with
the Metro URL baked in. Edit any file under `app/` or `src/`, save, and the
change appears on the phone in under a second.

Tunnel mode routes traffic through Expo's ngrok-backed relay so it works
regardless of LAN topology, Wi-Fi vs Ethernet, router AP isolation, or
Tailscale. If the tunnel is flaky, fall back to `expo start --lan`.

### Native loop — runs when a native dependency changes

```
npm run build:dev        # eas build --profile development --platform ios
eas build:run --latest --platform ios
```

Cloud builds take 10-15 minutes; installing the resulting `.ipa` takes ~1
minute. You only need this loop when something *native* changes: adding a
package with native code, upgrading Expo SDK, upgrading
`@react-native-firebase`, or changing a config plugin. Typical frequency is
weekly or monthly.

## Do NOT run `expo run:ios` locally

Local iOS builds on this machine fail in two stacked ways: `fmt 11.0.2`
doesn't compile under Apple Clang 21 (Xcode 26+), and Expo CLI's device
install path has a codesign race that silently ships unsigned bundles. EAS
Build with the pinned `macos-sequoia-15.6-xcode-16.4` image in `eas.json`
sidesteps both. Use `npm run ios` (which routes through EAS) or
`npm run build:dev` — never `expo run:ios`.

## First-time EAS Build credential setup

The first `eas build` run is interactive. It will prompt for Apple ID
credentials and offer to generate a development certificate and provisioning
profile. Answer yes; the Apple team for this project is `G8UYR68V26`. The
credentials are stored in EAS and reused on subsequent builds.

## When something breaks

- **`npm start` can't reach the phone** — try `expo start --lan` and the
  machine's Tailscale IP as a fallback. Worst case, run `expo start` on the
  same Wi-Fi as the phone.
- **EAS Build fails on fmt/consteval errors** — the Xcode pin has regressed.
  Check that `eas.json` still has `ios.image` set to
  `macos-sequoia-15.6-xcode-16.4` on the `development` profile.
- **Dev client won't launch or shows a blank screen** — uninstall from the
  phone and run `npm run ios` to rebuild+reinstall a fresh dev client.

## What's under the hood

- `eas.json` pins Xcode 16.4 on all three build profiles.
- `app.config.js` keeps `buildReactNativeFromSource: true` so
  `@react-native-firebase` can resolve `RCTBridgeModule` as a modular header
  (expo/expo#39233). Don't remove it without reading
  `memory/project_ios_build_workarounds.md` first.
- The `ios/` folder is gitignored and intentionally absent — EAS Build
  regenerates it in the cloud on every build.
```

- [ ] **Step 3: Verify the file was created and is non-empty**

Run: `wc -l docs/development.md`

Expected: output shows a line count between 50 and 80 lines.

- [ ] **Step 4: Commit**

```bash
git add docs/development.md
git commit -m "$(cat <<'EOF'
docs: add development.md covering the two-loop workflow

Daily work stays in the JS loop (expo start --tunnel + fast refresh);
native rebuilds go through EAS Build with the pinned Xcode image.
Documents the "do not run expo run:ios locally" rule so the stacked
local-build workarounds don't get rediscovered the hard way.

Part of the EAS build workflow migration
(docs/superpowers/specs/2026-04-09-eas-build-workflow-migration-design.md).
EOF
)"
```

---

## Task 5: Delete the local `ios/` folder, `.eas/.env/`, and `.env.local`

**Files:**
- Delete (on disk, not in git): `ios/`, `.eas/.env/`, `.env.local`

All three paths are in `.gitignore` (`/ios`, `.env*.local`; `.eas/` is a stray working directory that isn't tracked). None of them are in git, so `git status` should be unchanged after this task. This is a local cleanup only.

- [ ] **Step 1: Confirm none of the three paths are tracked by git**

Run: `git ls-files ios .eas .env.local | head`

Expected output: *empty* — no tracked files under any of these paths. If anything prints, STOP and report to the user before deleting; something is tracked that shouldn't be.

- [ ] **Step 2: Confirm the three paths are gitignore'd**

Run: `git check-ignore -v ios .eas/.env .env.local`

Expected output (three lines, one per path), each showing the matching `.gitignore` rule. Example:
```
.gitignore:42:/ios	ios
.gitignore:35:.env*.local	.env.local
```

`.eas/.env` may or may not match a rule — it's untracked either way, which is sufficient. The critical check is that `ios` and `.env.local` both appear.

- [ ] **Step 3: Delete `ios/`**

Run: `rm -rf ios`

Expected output: *empty*. This is destructive but safe — `ios/` is generated from `app.config.js` by prebuild and contains no hand-edited code except the Podfile fmt patch, which is precisely what we want to throw away.

- [ ] **Step 4: Delete `.eas/.env/`**

Run: `rm -rf .eas`

We remove the whole `.eas` directory because its only contents are `.env/`; leaving an empty `.eas/` would show up as a phantom untracked directory in `git status`.

- [ ] **Step 5: Delete `.env.local`**

Run: `rm -f .env.local`

- [ ] **Step 6: Verify all three paths are gone**

Run: `ls -la ios .eas .env.local 2>&1`

Expected output: three "No such file or directory" errors, one per path.

- [ ] **Step 7: Verify `git status` is unchanged from the pre-delete state**

Run: `git status --short`

Expected output (order may vary):
```
?? docs/superpowers/plans/2026-04-09-eas-build-workflow-migration.md
?? docs/superpowers/specs/2026-04-09-eas-build-workflow-migration-design.md
```

The two untracked files from the start of this work are the only entries. `.eas/` should have disappeared from the untracked list (we deleted it). If `ios/` or `.env.local` appear, something is wrong — stop and investigate.

No commit in this task — nothing is staged.

---

## Task 6: Update the memory entry for iOS build workarounds

**Files:**
- Modify: `~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/project_ios_build_workarounds.md`
- Modify: `~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/MEMORY.md`

The existing memory says local iOS builds depend on two stacked workarounds. After this migration that's false: the daily path is EAS Build, which pins Xcode 16.4 to avoid workaround #2 entirely, and only workaround #1 (`buildReactNativeFromSource`) remains — now baked into `app.config.js` and applied in the cloud. The memory body has to reflect that, but also preserve the historical context for *why* we pinned (so a future developer reading the file understands what happens if they unpin).

- [ ] **Step 1: Read the current memory file to confirm baseline**

Run: `cat ~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/project_ios_build_workarounds.md`

Confirm the content matches what's summarized in the spec's "Created" section. If it's already been updated, reconcile against the target content below before overwriting.

- [ ] **Step 2: Overwrite the memory file with the new content**

Write the following to `~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/project_ios_build_workarounds.md`:

```markdown
---
name: iOS build workarounds
description: iOS builds run on EAS Build with pinned Xcode 16.4; buildReactNativeFromSource is still required for RN Firebase modulemap; local builds are off the daily path
type: project
originSessionId: a06fa1d3-d679-4aa7-b85e-00722ac6f9dc
---
iOS builds for Rangtaal run on **EAS Build** with a pinned Xcode image. Local `expo run:ios` is off the daily path — do not run it. See `docs/development.md` for the current workflow.

**Why: 1. `buildReactNativeFromSource: true`** (in `app.config.js` plugins → `expo-build-properties`)

- Still required. With Expo SDK 54 + `newArchEnabled: true` + `useFrameworks: static`, the prebuilt React Native pods don't expose `RCTBridgeModule` as a modular header, which breaks `@react-native-firebase`'s Objective-C modules (`RNFBFirestore`, `RNFBApp`). Tracked at expo/expo#39233.
- Side effect: forces CocoaPods to compile `fmt`, `folly`, etc. from source, which is what makes the Xcode version matter (see #2 below).
- Applies to EAS cloud builds the same way it applied to local builds — `app.config.js` is the source of truth either way.

**Why: 2. Xcode 16.4 pinned in `eas.json`** (on all three build profiles)

- `eas.json` sets `build.<profile>.ios.image = "macos-sequoia-15.6-xcode-16.4"` for `development`, `preview`, and `production`.
- Reason: EAS Build's default iOS image ships Xcode 26 / Apple Clang 21, which rejects `FMT_STRING(...)` calls in `format-inl.h` ("call to consteval function ... is not a constant expression"). The signature is 5 errors in `format-inl.h` lines 59, 60, 1387, 1391, 1394. fmt 11.0.2 (vendored by RN 0.81.5) only guards `consteval` against Apple Clang < 14 in `base.h:122-127`, which doesn't cover Clang 21.
- Xcode 16.4 ships an older Apple Clang that predates the consteval tightening, so fmt 11.0.2 compiles cleanly. RN 0.81 was released targeting Xcode 16 — this is the matched pair, not a downgrade.
- The pin is revisitable when fmt ships a fix (fmt >= 11.1 may handle Clang 21) or when RN vendors a newer fmt. If the pin is removed, expect the fmt consteval failure to resurface on the next cloud build.

**Historical context** (pre-migration, local-build workaround that's now obsolete)

Before the EAS migration, local builds applied a `ios/Podfile` `post_install` hook that injected `FMT_USE_CONSTEVAL=0` into every pod target's `GCC_PREPROCESSOR_DEFINITIONS`, making `basic_format_string`'s constructor a regular function instead of `consteval`. That patch lived in the generated Podfile, was wiped by `expo prebuild --clean`, and was a recurring pain. It's no longer reachable because `ios/` is deleted locally and EAS Build regenerates it in the cloud — where the Xcode pin makes the patch unnecessary.

**How to apply:**
- Don't remove `buildReactNativeFromSource: true` from `app.config.js` without first verifying RN Firebase still resolves `RCTBridgeModule` (ideally confirm expo/expo#39233 is fixed in the Expo SDK in use).
- Don't remove the Xcode pin from `eas.json` without confirming fmt (or RN's vendored fmt) handles Apple Clang 21. If you do remove it, run a cloud build and watch for the `format-inl.h` errors listed above — that's the regression signature.
- Don't re-introduce `expo run:ios` to daily scripts. `npm run ios` already routes through `eas build` + `eas build:run`.
```

- [ ] **Step 3: Update the `MEMORY.md` index line to match the new description**

Read `~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/MEMORY.md` first.

Replace the single line:

```
- [iOS build workarounds](project_ios_build_workarounds.md) — Two stacked workarounds (buildReactNativeFromSource + FMT_USE_CONSTEVAL=0) that the iOS build depends on; lost on `expo prebuild --clean`
```

with:

```
- [iOS build workarounds](project_ios_build_workarounds.md) — EAS Build with pinned Xcode 16.4 + buildReactNativeFromSource; local `expo run:ios` is off the daily path
```

Keep the file as a single-line index (no frontmatter). Preserve the trailing newline.

- [ ] **Step 4: Verify both files read back correctly**

Run: `head -4 ~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/project_ios_build_workarounds.md && echo --- && cat ~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/MEMORY.md`

Expected:
- The memory file's first 4 lines show `---`, `name: iOS build workarounds`, the new `description:` line mentioning EAS Build / Xcode 16.4, and `type: project`.
- `MEMORY.md` shows the single updated index line ending in "off the daily path".

Memory is outside the repo — no git commit for this task.

---

## Task 7: Offline acceptance verification (tests + script sanity)

**Files:**
- No files modified.

The spec lists 10 acceptance criteria. Numbers 2-6 and 8 require EAS Build credentials, a device, or a running Metro server — those are user-gated and come after this plan finishes (see Task 8 below). Numbers 1 (partial — we can at least *start* the tunnel), 7, 8 (partial — we already verified `ios/` is gone in Task 5), 9, and 10 can be verified here and now.

- [ ] **Step 1: Run the existing Jest suite**

Run: `npm test`

Expected output: Jest picks up the 4 test files under `__tests__/`, all tests pass, no failures, no import errors for `@react-native-firebase/*` (existing mocks in `jest.setup.ts` handle them). Exit code 0.

If any test fails, STOP. No source files changed in this migration, so a failure means something upstream is broken — investigate before declaring acceptance-criterion-7 met.

- [ ] **Step 2: Confirm `docs/development.md` exists and contains the key phrases**

Run: `test -f docs/development.md && grep -c 'expo start --tunnel' docs/development.md && grep -c 'build:dev' docs/development.md && grep -c 'Xcode 16.4' docs/development.md`

Expected: each grep prints a positive integer (at least 1 match per phrase). Satisfies acceptance criterion 9.

- [ ] **Step 3: Confirm the memory entry reflects the new reality**

Run: `grep -l 'EAS Build' ~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/project_ios_build_workarounds.md && grep -l 'pinned Xcode 16.4' ~/.claude/projects/-Users-nikpatel-Documents-GitHub-Rangtaal/memory/MEMORY.md`

Expected: both files print their paths (match found). Satisfies acceptance criterion 10.

- [ ] **Step 4: Confirm `ios/` is gone**

Run: `test ! -e ios && echo 'ios absent'`

Expected: `ios absent`. Satisfies acceptance criterion 8.

- [ ] **Step 5: Confirm `eas.json` pin is present on the development profile**

Run: `node -e "const j=JSON.parse(require('fs').readFileSync('eas.json','utf8')); console.log(j.build.development.ios.image === 'macos-sequoia-15.6-xcode-16.4' ? 'dev profile pinned' : 'MISSING');"`

Expected: `dev profile pinned`.

- [ ] **Step 6: Confirm `npm run start` is wired to tunnel mode (without actually starting Metro)**

Run: `node -e "const j=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(j.scripts.start);"`

Expected: `expo start --tunnel`.

Do NOT actually run `npm start` here — it boots a long-running server and will block the plan. The user will run it as part of their side of acceptance.

No commit in this task — it's read-only verification.

---

## Task 8: Hand back to the user for online acceptance

**Files:**
- None.

The acceptance criteria that require EAS credentials, a connected iPhone, or live Metro are explicitly user-gated in the spec ("Hand back uncommitted changes for user review" + "User runs `npm run build:dev` ..."). This task is the hand-off.

- [ ] **Step 1: Confirm the branch has the three expected commits**

Run: `git log --oneline phase-1-foundation..HEAD`

Expected output (in reverse-chronological order, one commit per line):
```
<sha> docs: add development.md covering the two-loop workflow
<sha> chore(scripts): route start through tunnel and ios/android through EAS Build
<sha> chore(eas): pin Xcode 16.4 image on all iOS build profiles
```

Three commits, all on `eas-build-workflow-migration`, nothing on `phase-1-foundation`.

- [ ] **Step 2: Confirm working tree has only the pre-existing untracked entries**

Run: `git status --short`

Expected output:
```
?? docs/superpowers/plans/2026-04-09-eas-build-workflow-migration.md
?? docs/superpowers/specs/2026-04-09-eas-build-workflow-migration-design.md
```

(Order may vary.) No staged changes, no modified tracked files. The plan and spec documents are untracked by design — the user decides whether to commit them.

- [ ] **Step 3: Report the hand-off summary to the user**

Output a short message to the user containing:

1. Branch name: `eas-build-workflow-migration` off `phase-1-foundation`.
2. The three commits (short SHAs + subjects).
3. Which acceptance criteria are already satisfied offline (1-partial, 7, 8, 9, 10).
4. What the user needs to do for the online criteria (2-6):
   - `npm run build:dev` — first run is interactive, will prompt for Apple ID credentials. Expect 10-15 minutes for the cloud build.
   - `eas build:run --latest --platform ios` — installs on the connected iPhone.
   - `npm start` in a separate terminal — waits for the QR code; scan from iPhone Camera.
   - Tap the dev client icon, verify the login screen loads, enter a phone number and tap Send OTP to verify the auth flow reaches `verify.tsx` without crashing.
   - Edit `app/(auth)/login.tsx` (e.g., change the title) and save; confirm fast refresh lands on the phone within a couple seconds.
5. Whether to commit the plan and spec files (user preference — not automatic).

No commit in this task — the plan ends here with uncommitted changes and a branch ready for review.

---

## Self-review notes

- **Spec coverage:** every item in the spec's "File-level changes" section maps to a task (Task 2 → `eas.json`, Task 3 → `package.json`, Task 4 → `docs/development.md`, Task 5 → deletions, Task 6 → memory, Task 1 → branch creation, Task 7 → offline verification, Task 8 → hand-off matching the spec's "Implementation sequence" steps 1-10). `app.config.js` is called out as explicitly untouched.
- **Acceptance criteria coverage:** 1 is partially verified in Task 7 (script is wired; full "runs cleanly" is user-gated); 2-6 are user-gated (Task 8); 7 is Task 7 step 1; 8 is Task 7 step 4; 9 is Task 7 step 2; 10 is Task 7 step 3. Nothing is missed.
- **No placeholders:** every code block is real content. No "TBD", no "similar to above", no abstract "handle errors".
- **No auto-commit:** the plan creates three commits for the three file edits but explicitly does NOT commit `docs/superpowers/plans/...` or `docs/superpowers/specs/...`. It does NOT push. It does NOT merge. It does NOT run the interactive `eas build`. All three are explicitly user-gated per the spec's "Out of scope" list.
