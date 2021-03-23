const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebExtPlugin = require('web-ext-plugin');
const {
  BugsnagBuildReporterPlugin,
  BugsnagSourceMapUploaderPlugin,
} = require('webpack-bugsnag-plugins');
const pjson = require('./package.json');

// Look for an --env arguments to pass along when running Firefox
const env = Object.fromEntries(
  process.argv
    .filter((_arg, index, args) => index && args[index - 1] === '--env')
    .map((kv) => (kv.indexOf('=') === -1 ? [kv, true] : kv.split('=')))
);
const firefox = env.firefox || undefined;
const firefoxProfile = env.firefoxProfile || undefined;
const keepProfileChanges = !!env.keepProfileChanges;
const profileCreateIfMissing = !!env.profileCreateIfMissing;

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
    new WebExtPlugin({
      firefox,
      firefoxProfile,
      keepProfileChanges,
      profileCreateIfMissing,
      startUrl: ['tests/playground.html'],
      sourceDir: path.resolve(__dirname, 'dist-firefox'),
    }),
  ],
};

if (process.env.RELEASE_BUILD && process.env.BUGSNAG_API_KEY) {
  firefoxConfig.plugins.push(
    new BugsnagBuildReporterPlugin(
      {
        apiKey: process.env.BUGSNAG_API_KEY,
        appVersion: pjson.version,
      },
      {}
    )
  );
  firefoxConfig.plugins.push(
    new BugsnagSourceMapUploaderPlugin(
      {
        apiKey: process.env.BUGSNAG_API_KEY,
        appVersion: pjson.version,
        ignoredBundleExtensions: ['.css', '.json', '.idx', '.svg', '.html'],
        publicPath: `https://github.com/birtles/rikaichamp/releases/download/v${pjson.version}/`,
        overwrite: true,
      },
      {}
    )
  );
}

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
        { from: 'lib/browser-polyfill.js*', to: '[name][ext]' },
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
