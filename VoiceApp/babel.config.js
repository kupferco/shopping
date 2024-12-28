module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: `.env.${process.env.NODE_ENV || 'development'}`,
        safe: false,
        allowUndefined: true,
      },
    ],
  ],
};
