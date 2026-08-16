module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo wires up Expo Router, Reanimated, and React Compiler.
    // React Compiler automatically memoizes components and hooks at build time.
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
          reactCompiler: true,
        },
      ],
      'nativewind/babel',
    ],

    // Inlines `.sql` files as strings at build time, so the generated Drizzle
    // migrations can be `import`ed. Pairs with `sourceExts.push('sql')` in
    // metro.config.js — both halves are required, and without this one Metro tries
    // to parse the migration SQL as JavaScript.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
