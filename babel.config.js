module.exports = function (api) {
  const isTest = api.env("test");
  api.cache(!isTest);

  return {
    presets: [
      [
        "babel-preset-expo",
        // Disable the auto-added reanimated plugin in test environments
        // so that react-native-worklets/plugin (a peer dep of reanimated v4)
        // doesn't need to be installed just for Jest to run.
        isTest ? { reanimated: false } : {},
      ],
    ],
  };
};
