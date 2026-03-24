const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 避免 dotenv 等 Node 模块被 bundler 打包到 React Native 运行时
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
