import rspack from '@rspack/core';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pjson = require('./package.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// This separate rspack config is needed because react-cosmos doesn't support
// rspack configurations that export multiple configurations:
//
// https://webpack.js.org/configuration/configuration-types/#exporting-multiple-configurations
const config = {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          { loader: rspack.CssExtractRspackPlugin.loader },
          {
            loader: 'css-loader',
            options: { url: false, sourceMap: false },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          /** @type {import('@rspack/core').SwcLoaderOptions} */
          options: {
            sourceMap: true,
            jsc: {
              parser: { syntax: 'typescript' },
              target: 'es2020',
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.tsx$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          /** @type {import('@rspack/core').SwcLoaderOptions} */
          options: {
            sourceMap: true,
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                  throwIfNamespace: true,
                  useBuiltins: true,
                },
              },
              target: 'es2020',
            },
          },
        },
        type: 'javascript/auto',
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
    new rspack.DefinePlugin({
      __ACTIVE_TAB_ONLY__: false,
      __SUPPORTS_SVG_ICONS__: false,
      __SUPPORTS_TAB_CONTEXT_TYPE__: false,
      __VERSION__: `'${pjson.version}'`,
    }),
    new rspack.NormalModuleReplacementPlugin(
      /\/i18n$/,
      path.resolve(__dirname, 'src', 'common', 'i18n.polyfill.tsx')
    ),
    new HtmlWebpackPlugin({
      template: './src/options/options.html',
    }),
    new rspack.CssExtractRspackPlugin(),
    new rspack.CopyRspackPlugin({
      patterns: ['css/*', 'fonts/*', 'images/*'],
    }),
  ],
};

export default config;
