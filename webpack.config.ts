import * as path from 'path';
import * as webpack from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';

const srcDir = './extension/';

const config: webpack.Configuration = {
  entry: {
    // Included in options.html.
    options: path.join(__dirname, srcDir + 'options.ts'),
    // Injected into web pages.
    rikaicontent: path.join(__dirname, srcDir + 'rikaicontent.ts'),
    // These are all loaded in the background.html.
    background: path.join(__dirname, srcDir + 'background.ts'),
    // TODO(espeed): Remove these once they're part of background.js explicitly.
    data: path.join(__dirname, srcDir + 'data.ts'),
    rikaichan: path.join(__dirname, srcDir + 'rikaichan.ts'),
    texttospeech: path.join(__dirname, srcDir + 'texttospeech.ts'),
  },
  // Output to ./dist directory as <entry_name>.js.
  output: {
    path: path.join(__dirname, './dist/'),
    filename: '[name].js',
    // Allows outputing normal JS with no webpack wrapper.
    module: true,
  },
  module: {
    // Compiles all extension/*.ts files through ts-loader.
    rules: [
      {
        test: /extension\/\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  experiments: {
    // Required for output.module option.
    outputModule: true,
  },
  optimization: {
    // TODO(espeed): Remove after typescript files are cleaned up.
    emitOnErrors: false,
    minimize: false,
  },
  plugins: [
    // Used to copy static files to output directory.
    new CopyPlugin({
      patterns: [
        {
          // Everything from the perspective of the extension.
          context: 'extension/',
          // All files in all directories.
          from: '**/*',
          // Keep the same relative file structure.
          to: '[path][name].[ext]',
          // Exclude typescript files which are compiled by ts-loader.
          globOptions: {
            ignore: ['**/*.ts'],
          },
        },
      ],
    }),
  ],
};

export default (env: unknown, argv: webpack.WebpackOptionsNormalized) => {
  if (argv.mode === 'development') {
    config.devtool = 'inline-source-map';
  }

  return config;
};
