module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo wires up Expo Router and, from SDK 50, adds the
    // Reanimated plugin automatically once Reanimated is installed. Do not add
    // that plugin by hand — doing so double-applies it and, on some versions,
    // fails to resolve.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    // Inlines `.sql` files as strings at build time, so the generated Drizzle
    // migrations can be `import`ed. Pairs with `sourceExts.push('sql')` in
    // metro.config.js — both halves are required, and without this one Metro tries
    // to parse the migration SQL as JavaScript.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
