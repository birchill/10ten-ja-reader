import * as path from 'path';
import { Config } from 'karma';

const webpack = require('webpack');
const pjson = require('./package.json');

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
      plugins: [
        new webpack.DefinePlugin({
          __ACTIVE_TAB_ONLY__: false,
          __ALLOW_MAC_CTRL__: false,
          __SUPPORTS_SVG_ICONS__: false,
          __SUPPORTS_TAB_CONTEXT_TYPE__: false,
          __VERSION__: `'${pjson.version}'`,
        }),
      ],
    },
    webpackMiddleware: {},
    frameworks: ['mocha', 'chai', 'webpack'],
    browsers: ['FirefoxHeadless', 'ChromeHeadless'],
    plugins: [
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-webpack'),
      require('karma-firefox-launcher'),
      require('karma-chrome-launcher'),
    ],
  });
};
