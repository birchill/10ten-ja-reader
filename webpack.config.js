const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebExtWebpackPlugin = require('web-ext-webpack-plugin');

// Look for a --firefox <path> argument
const firefoxIndex = process.argv.indexOf('--firefox');
const firefox =
  firefoxIndex !== -1 && firefoxIndex < process.argv.length - 1
    ? process.argv[firefoxIndex + 1]
    : undefined;

// Likewise for firefoxProfile
const firefoxProfileIndex = process.argv.indexOf('--firefoxProfile');
const firefoxProfile =
  firefoxProfileIndex !== -1 && firefoxProfileIndex < process.argv.length - 1
    ? process.argv[firefoxProfileIndex + 1]
    : undefined;

const commonConfig = {
  // No need for uglification etc.
  mode: 'development',
  devtool: 'source-map',
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
      { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};

const commonExtConfig = {
  ...commonConfig,
  entry: {
    'rikaichamp-content': './src/content.ts',
    'rikaichamp-background': './src/background.ts',
    'rikaichamp-options': './src/options.ts',
    'rikaichamp-jpdict': './src/jpdict-worker.ts',
  },
};

const getPreprocessorConfig = (...features) => ({
  test: /\.src$/,
  use: [
    {
      loader: 'file-loader',
      options: {
        name: '[name]',
      },
    },
    {
      loader:
        'webpack-preprocessor?' +
        features.map((feature) => `definitions[]=${feature}`).join(','),
    },
  ],
});

const extendArray = (array, ...newElems) => {
  const result = array.slice();
  result.push(...newElems);
  return result;
};

const firefoxConfig = {
  ...commonExtConfig,
  module: {
    ...commonExtConfig.module,
    rules: extendArray(
      commonExtConfig.module.rules,
      getPreprocessorConfig(
        'supports_alpha_version',
        'supports_svg_icons',
        'supports_browser_style',
        'supports_applications_field'
      )
    ),
  },
  output: {
    path: path.resolve(__dirname, 'dist-firefox'),
    filename: '[name].js',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        // Despite the fact that we inject popup.css directly into the
        // content script, we still package it as a separate file in the add-on
        // so that we can load it in the options page.
        //
        // One day we might decide to inject popup.css into the options page
        // script too, but for now we duplicate this content.
        'css/*',
        'images/*.svg',
        'data/*',
        '_locales/**/*',
      ],
    }),
    new WebExtWebpackPlugin({
      firefox,
      firefoxProfile,
      startUrl: ['tests/playground.html'],
      sourceDir: path.resolve(__dirname, 'dist-firefox'),
    }),
  ],
};

const chromeConfig = {
  ...commonExtConfig,
  module: {
    ...commonExtConfig.module,
    rules: extendArray(
      commonExtConfig.module.rules,
      getPreprocessorConfig('use_polyfill')
    ),
  },
  output: {
    path: path.resolve(__dirname, 'dist-chrome'),
    filename: '[name].js',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        'css/*',
        'images/*',
        'data/*',
        '_locales/**/*',
        { from: 'lib/browser-polyfill.js*', to: '[name].[ext]' },
      ],
    }),
  ],
};

const testConfig = {
  ...commonConfig,
  name: 'tests',
  entry: {
    'content-loader': './tests/content-loader.ts',
  },
  output: {
    path: path.resolve(__dirname, 'tests'),
    filename: '[name].js',
  },
};

module.exports = (env, argv) => {
  let configs = [testConfig];
  if (env && env.target === 'chrome') {
    configs.push({ ...chromeConfig, name: 'extension' });
  } else {
    configs.push({ ...firefoxConfig, name: 'extension' });
  }

  return configs;
};
