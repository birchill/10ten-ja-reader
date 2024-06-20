import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';

const require = createRequire(import.meta.url);
const pjson = require('./package.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        use: [
          { loader: MiniCssExtractPlugin.loader },
          'css-loader',
          'postcss-loader',
        ],
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
      __SUPPORTS_SVG_ICONS__: false,
      __SUPPORTS_TAB_CONTEXT_TYPE__: false,
      __VERSION__: `'${pjson.version}'`,
    }),
    new webpack.NormalModuleReplacementPlugin(
      /\/i18n$/,
      path.resolve(__dirname, 'src', 'common', 'i18n.polyfill.tsx')
    ),
    new HtmlWebpackPlugin({
      template: './src/options/options.html',
    }),
    new MiniCssExtractPlugin(),
    new CopyWebpackPlugin({
      patterns: ['fonts/*', 'images/*'],
    }),
  ],
};

export default config;
