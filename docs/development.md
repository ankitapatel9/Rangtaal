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
