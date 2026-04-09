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
  scheme: "rangtaal",
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
    // Firebase iOS phone auth SDK asserts that a URL scheme matching
    // GoogleService-Info.plist's REVERSED_CLIENT_ID is registered, even
    // for apps that never call Google Sign-In. Without it,
    // PhoneAuthProvider.verifyPhoneNumber triggers a fatal EXC_BREAKPOINT
    // before it even checks whether the number is a test number.
    // See: expo/expo#39233-adjacent issues; Firebase iOS SDK internals.
    infoPlist: {
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            "com.googleusercontent.apps.560643723293-c2r4ktqn44fdf3kmm3m2ung5dfronnj2",
          ],
        },
      ],
    },
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
