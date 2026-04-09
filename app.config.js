// Dynamic Expo config. Reads Firebase config file paths from EAS
// environment variables so cloud builds pick them up without the files
// being committed to git. Falls back to the local paths for developer
// machines where the files live in the repo root (gitignored).
//
// The EAS env vars `GOOGLE_SERVICES_PLIST` and `GOOGLE_SERVICES_JSON`
// are uploaded via `eas env:create --type file --visibility sensitive`
// and point at temp paths inside the EAS build container at build time.

/**
 * @param {import('expo/config').ConfigContext} _context
 * @returns {import('expo/config').ExpoConfig}
 */
module.exports = () => ({
  name: "Rangtaal",
  slug: "Rangtaal",
  version: "1.0.0",
  // scheme is an ARRAY so Expo's config plugin generates
  // CFBundleURLTypes with both entries and we never have to override
  // ios.infoPlist.CFBundleURLTypes directly (which would conflict
  // with the abstract property and trigger a warning that crashes
  // prebuild due to a chalk version mismatch in @expo/config-plugins).
  //
  // ORDER MATTERS: Firebase iOS SDK's reCAPTCHA fallback uses the FIRST
  // custom URL scheme it finds in CFBundleURLTypes as the return target
  // from its web view. Putting the REVERSED_CLIENT_ID scheme FIRST means
  // Firebase's reCAPTCHA callback URL becomes
  //   com.googleusercontent.apps.xxx://firebaseauth/link?...
  // which Expo Router does NOT intercept (it only handles rangtaal://).
  // If rangtaal was first, Firebase's callback would collide with Expo
  // Router's deep link handler and show "Unmatched Route" instead of
  // completing auth.
  //
  // - REVERSED_CLIENT_ID  → first, for Firebase phone auth reCAPTCHA callback
  // - "rangtaal"          → deep link scheme for Expo Router navigation
  scheme: [
    "com.googleusercontent.apps.560643723293-c2r4ktqn44fdf3kmm3m2ung5dfronnj2",
    "rangtaal",
  ],
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.rangtaal.app",
    googleServicesFile:
      process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist",
  },
  android: {
    package: "com.rangtaal.app",
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
          // Work around expo/expo#39233: on SDK 54 with newArchEnabled +
          // useFrameworks: static, the default prebuilt React Native pods
          // don't expose RCTBridgeModule as a modular header, which breaks
          // @react-native-firebase's Objective-C modules (RNFBFirestore,
          // RNFBApp). Building RN from source sidesteps that by letting
          // CocoaPods generate the modulemap with the header exposed.
          buildReactNativeFromSource: true,
        },
      },
    ],
    "@react-native-firebase/app",
  ],
  extra: {
    router: {},
    eas: {
      projectId: "292cec9c-4ded-461c-b753-e0fa697f6d14",
    },
  },
  owner: "nikpatel007",
});
