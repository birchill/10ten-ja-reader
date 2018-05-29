const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebExtWebpackPlugin = require('web-ext-webpack-plugin');

const commonConfig = {
  // No need for uglification etc.
  mode: 'development',
  devtool: 'source-map',
  module: {
    rules: [
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
      loader: `webpack-preprocessor?definitions=['${features.join(',')}']`,
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
      getPreprocessorConfig('svgicons')
    ),
  },
  output: {
    path: path.resolve(__dirname, 'dist-firefox'),
    filename: '[name].js',
  },
  plugins: [
    new CopyWebpackPlugin(['css/*', 'images/*', 'data/*']),
    new WebExtWebpackPlugin({
      browserConsole: true,
      startUrl: ['__tests__/playground.html'],
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
      getPreprocessorConfig('usepolyfill')
    ),
  },
  output: {
    path: path.resolve(__dirname, 'dist-chrome'),
    filename: '[name].js',
  },
  plugins: [
    new CopyWebpackPlugin([
      'css/*',
      'images/*',
      'data/*',
      { from: 'lib/browser-polyfill.js*', to: '.' },
    ]),
  ],
};

const testConfig = {
  ...commonConfig,
  name: 'tests',
  entry: {
    'content-loader': './__tests__/content-loader.ts',
  },
  output: {
    path: path.resolve(__dirname, '__tests__'),
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
