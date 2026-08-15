module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo wires up Expo Router and, from SDK 50, adds the
    // Reanimated plugin automatically once Reanimated is installed. Do not add
    // that plugin by hand — doing so double-applies it and, on some versions,
    // fails to resolve.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
