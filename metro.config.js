const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add GLB files to asset extensions
config.resolver.assetExts.push('glb', 'gltf', 'obj', 'mtl', 'fbx');

module.exports = config;