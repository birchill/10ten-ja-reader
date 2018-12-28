const path = require('path');

module.exports = config => {
  config.set({
    basePath: 'tests',
    files: ['*.test.ts'],
    preprocessors: {
      '*.test.ts': ['webpack'],
    },
    webpack: {
      mode: 'development',
      resolve: {
        extensions: ['.ts', '.js'],
      },
      resolveLoader: {
        modules: [path.join(__dirname, 'node_modules')],
      },
      module: {
        rules: [{ test: /\.ts$/, use: 'ts-loader' }],
      },
    },
    frameworks: ['mocha', 'chai'],
    browsers: ['FirefoxHeadless'],
    plugins: [
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-webpack'),
      require('karma-firefox-launcher'),
    ],
  });
};
