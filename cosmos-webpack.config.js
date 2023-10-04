import webpack from 'webpack';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pjson = require('./package.json');

// This separate webpack config is needed because react-cosmos doesn't support
// webpack configurations that export multiple configurations:
//
// https://webpack.js.org/configuration/configuration-types/#exporting-multiple-configurations
const config = {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['css-loader'],
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' },
    ],
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
    },
    extensions: ['.ts', '.tsx', '.js'],
  },
  plugins: [
    new webpack.DefinePlugin({
      __ACTIVE_TAB_ONLY__: false,
      __EXTENSION_CONTEXT__: false,
      __SUPPORTS_SVG_ICONS__: false,
      __SUPPORTS_TAB_CONTEXT_TYPE__: false,
      __VERSION__: `'${pjson.version}'`,
    }),
  ],
};

export default config;
