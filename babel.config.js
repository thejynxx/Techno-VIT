module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Transform `import.meta` to a RN-compatible polyfill for Expo Web
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [],
  };
};