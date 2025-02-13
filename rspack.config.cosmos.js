import rspack from '@rspack/core';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import pjson from './package.json' with { type: 'json' };

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
          { loader: 'css-loader', options: { url: false, sourceMap: false } },
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
            jsc: { parser: { syntax: 'typescript' }, target: 'es2020' },
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
              parser: { syntax: 'typescript', tsx: true },
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
      'webextension-polyfill': path.resolve(
        __dirname,
        'tests/browser-polyfill.ts'
      ),
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
    new rspack.HtmlRspackPlugin({ template: './src/options/options.html' }),
    new rspack.CssExtractRspackPlugin(),
    new rspack.CopyRspackPlugin({ patterns: ['css/*', 'fonts/*', 'images/*'] }),
  ],
};

export default config;
