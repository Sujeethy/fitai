const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the workspace root so edits in packages/* trigger a reload,
// and let Metro resolve dependencies hoisted to the root node_modules.
//
// `disableHierarchicalLookup` is deliberately NOT set. It was here to work around
// pnpm's symlinked layout, but `.npmrc` sets `node-linker=hoisted`, which gives
// Metro the flat tree it expects — so the workaround became not just unnecessary
// but wrong, and `expo-doctor` flags it.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Drizzle ships migrations as .sql; Metro must treat them as assets.
config.resolver.sourceExts.push('sql');

module.exports = withNativeWind(config, { input: './global.css' });
