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

Runs `scripts/start-dev.sh`, which starts an ngrok tunnel and Metro bundler.
Wait ~10 seconds for the tunnel URL to print. On the phone, open the Rangtaal
dev client and tap **"Enter URL manually"**, then paste the `https://...ngrok-free.app`
URL. Subsequent launches remember the last URL.

Edit any file under `app/` or `src/`, save, and the change appears on the
phone in under a second via fast refresh.

The tunnel routes traffic through ngrok so it works regardless of LAN topology,
Wi-Fi vs Ethernet, router AP isolation, or firewall settings.

**Fallback** — if ngrok is down, use `expo start --lan` with both devices on
the same Wi-Fi. You may need to allow Node through the macOS firewall
(`/usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node)`).

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

## First-time setup

1. Run `eas env:pull --environment development` to pull Firebase config files
   locally. This creates `.env.local` and `.eas/.env/` (both gitignored).
2. Create symlinks for local config introspection:
   ```
   ln -sf .eas/.env/GOOGLE_SERVICES_PLIST GoogleService-Info.plist
   ln -sf .eas/.env/GOOGLE_SERVICES_JSON google-services.json
   ```
3. Run `npm run build:dev` for the first EAS Build. It will prompt for Apple ID
   credentials and offer to generate a development certificate and provisioning
   profile. Answer yes; the Apple team is `G8UYR68V26`. Credentials are stored
   in EAS and reused on subsequent builds.
4. Install: `eas build:run --latest --platform ios`
5. Start developing: `npm start`

## When something breaks

- **`npm start` fails on ngrok** — check https://status.ngrok.com/. Fallback:
  `expo start --lan` on the same Wi-Fi as the phone.
- **EAS Build fails on fmt/consteval errors** — the Xcode pin has regressed.
  Check that `eas.json` still has `ios.image` set to
  `macos-sequoia-15.6-xcode-16.4` on the `development` profile.
- **Dev client won't launch or shows a blank screen** — uninstall from the
  phone and run `npm run ios` to rebuild+reinstall a fresh dev client.
- **`eas build` fails on GoogleService-Info.plist not found** — run
  `eas env:pull --environment development` to restore the local env files,
  then recreate the symlinks (step 2 above).

## What's under the hood

- `eas.json` pins Xcode 16.4 on all three build profiles.
- `app.config.js` keeps `buildReactNativeFromSource: true` so
  `@react-native-firebase` can resolve `RCTBridgeModule` as a modular header
  (expo/expo#39233). Don't remove it without reading
  `memory/project_ios_build_workarounds.md` first.
- `index.js` re-exports `expo-router/entry` — the dev client binary requests
  `/index.bundle` from Metro, which needs this file to resolve the entry point.
- `scripts/start-dev.sh` works around a bug in `@expo/ngrok` by running ngrok
  directly and passing the tunnel URL to Metro via `EXPO_PACKAGER_PROXY_URL`.
- The `ios/` folder is gitignored and intentionally absent — EAS Build
  regenerates it in the cloud on every build.
