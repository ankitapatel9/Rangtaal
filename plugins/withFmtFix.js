/**
 * Expo config plugin that injects FMT_USE_CONSTEVAL=0 into all pod targets.
 *
 * This works around a compatibility issue between fmt 11.0.2 (vendored by
 * React Native 0.81.5) and Apple Clang 21 (Xcode 26+). Clang 21 tightened
 * consteval semantics, causing 5 compilation errors in format-inl.h.
 *
 * Setting FMT_USE_CONSTEVAL=0 makes basic_format_string's constructor a
 * regular function instead of consteval, sidestepping the issue.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withFmtFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, "utf-8");

      // Check if the fix is already applied
      if (podfileContent.includes("FMT_USE_CONSTEVAL")) {
        return config;
      }

      // Inject the post_install hook to add FMT_USE_CONSTEVAL=0
      const postInstallHook = `
  # Fix fmt 11.0.2 consteval incompatibility with Apple Clang 21 (Xcode 26+)
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        unless defs.include?('FMT_USE_CONSTEVAL=0')
          defs << 'FMT_USE_CONSTEVAL=0'
        end
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
      end
    end
  end
`;

      // If there's already a post_install block, inject into it
      if (podfileContent.includes("post_install do |installer|")) {
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|
    # Fix fmt consteval for Xcode 26+
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        unless defs.include?('FMT_USE_CONSTEVAL=0')
          defs << 'FMT_USE_CONSTEVAL=0'
        end
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
      end
    end`
        );
      } else {
        // Append before the last 'end' in the Podfile
        const lastEndIndex = podfileContent.lastIndexOf("end");
        if (lastEndIndex !== -1) {
          podfileContent =
            podfileContent.slice(0, lastEndIndex) +
            postInstallHook +
            "\n" +
            podfileContent.slice(lastEndIndex);
        }
      }

      fs.writeFileSync(podfilePath, podfileContent, "utf-8");
      return config;
    },
  ]);
}

module.exports = withFmtFix;
