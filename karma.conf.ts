import * as path from 'path';
import { Config } from 'karma';

module.exports = (config: Config) => {
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
        rules: [
          {
            test: /\.css$/,
            use: ['css-loader'],
          },
          {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/,
          },
        ],
      },
    },
    webpackMiddleware: {},
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
