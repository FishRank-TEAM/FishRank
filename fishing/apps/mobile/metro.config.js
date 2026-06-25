const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

function resolvePackage(name) {
  const local = path.join(projectRoot, 'node_modules', name);
  if (fs.existsSync(local)) return local;
  return path.join(workspaceRoot, 'node_modules', name);
}

// Monorepo: web(19.2.x)과 mobile(19.1.0)이 각각 react를 두면 Invalid hook call 발생.
// mobile 의존성은 루트 node_modules에 호이스팅되므로 명시적으로 연결한다.
const mobilePkg = require('./package.json');
const mobileDeps = Object.keys(mobilePkg.dependencies ?? {});
const singletons = [
  'react',
  'react-native',
  'expo',
  'expo-router',
  'expo-modules-core',
  'expo-constants',
  '@expo/metro-runtime',
];

config.resolver.extraNodeModules = [...new Set([...singletons, ...mobileDeps])].reduce((acc, name) => {
  acc[name] = resolvePackage(name);
  return acc;
}, {});

const reactRoot = resolvePackage('react');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const subpath = moduleName === 'react' ? 'index.js' : `${moduleName.slice('react/'.length)}.js`;
    return { type: 'sourceFile', filePath: path.join(reactRoot, subpath) };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
