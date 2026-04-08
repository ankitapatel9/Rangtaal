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
        ios: { useFrameworks: "static" },
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
