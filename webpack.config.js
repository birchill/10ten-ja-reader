const path = require('path');
const WebExtWebpackPlugin = require('web-ext-webpack-plugin');

module.exports = {
  // No need for uglification etc.
  mode: 'development',
  entry: {
    'rikaichamp-content': './src/content.ts',
    // XXX Bundle browser-polyfill into the above
    'rikaichamp-background': './src/background.ts',
    // XXX Bundle browser-polyfill into the below
    'rikaichamp-options': './src/options.ts',
    'content-loader': './__tests__/content-loader.ts',
  },
  output: {
    path: path.resolve(__dirname, 'extension'),
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
