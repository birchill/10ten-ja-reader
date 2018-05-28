const path = require('path');
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
      {
        test: /\.src$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name]',
            },
          },
          {
            loader: "webpack-preprocessor?definitions=['svgicons']",
          },
        ],
      },
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
  output: {
    path: path.resolve(__dirname, 'extension'),
    filename: '[name].js',
  },
};

const firefoxConfig = {
  ...commonExtConfig,
  plugins: [
    new WebExtWebpackPlugin({
      browserConsole: true,
      startUrl: ['__tests__/playground.html'],
      sourceDir: path.resolve(__dirname, 'extension'),
    }),
  ],
};

const testConfig = {
  ...commonConfig,
  entry: {
    'content-loader': './__tests__/content-loader.ts',
  },
  output: {
    path: path.resolve(__dirname, '__tests__'),
    filename: '[name].js',
  },
};

module.exports = [firefoxConfig, testConfig];
