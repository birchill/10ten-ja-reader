const path = require('path');
const WebExtWebpackPlugin = require('web-ext-webpack-plugin');

module.exports = {
  // No need for uglification etc.
  mode: 'development',
  entry: {
    'extension/rikaichamp-content': './src/content.ts',
    'extension/rikaichamp-background': './src/background.ts',
    'extension/rikaichamp-options': './src/options.ts',
    '__tests__/content-loader': './__tests__/content-loader.ts',
  },
  output: {
    path: path.resolve(__dirname),
    filename: '[name].js',
  },
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
  plugins: [
    new WebExtWebpackPlugin({
      // web-ext-webpack-plugin doesn't actually support 'browserConsole' or
      // 'startUrl' yet, but hopefully it will one day.
      browserConsole: true,
      startUrl: ['__tests__/playground.html'],
      sourceDir: path.resolve(__dirname, 'extension'),
    }),
  ],
};
