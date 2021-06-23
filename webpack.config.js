const path = require('path');
const BomPlugin = require('webpack-utf8-bom');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WebExtPlugin = require('web-ext-plugin');
const {
  BugsnagBuildReporterPlugin,
  BugsnagSourceMapUploaderPlugin,
} = require('webpack-bugsnag-plugins');
const webpack = require('webpack');

const pjson = require('./package.json');

// Look for an --env arguments to pass along when running Firefox / Chrome
const env = Object.fromEntries(
  process.argv
    .filter((_arg, index, args) => index && args[index - 1] === '--env')
    .map((kv) => (kv.indexOf('=') === -1 ? [kv, true] : kv.split('=')))
);
const chromium = env.chromium || undefined;
const chromiumProfile = env.chromiumProfile || undefined;
const firefox = env.firefox || undefined;
const firefoxProfile = env.firefoxProfile || undefined;
const keepProfileChanges = !!env.keepProfileChanges;
const profileCreateIfMissing = !!env.profileCreateIfMissing;

const commonConfig = {
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
  plugins: [
    new webpack.DefinePlugin({
      __ACTIVE_TAB_ONLY__: false,
      __SUPPORTS_SVG_ICONS__: false,
      __SUPPORTS_TAB_CONTEXT_TYPE__: false,
      __VERSION__: `'${pjson.version}'`,
    }),
  ],
};

const commonExtConfig = {
  ...commonConfig,
  // We turn on production mode simply so we can drop unused code from the
  // bundle -- otherwise we'll end up injecting a bunch of unrelated code like
  // Russian toke stopwords into the content script.
  //
  // We _could_ use mode: 'development' and then set optimization as follows:
  //
  //   optimization: {
  //      minimize: true,
  //      minimizer: [...(as below)...],
  //      usedExports: true
  //   }
  //
  // but then we'd end up including a bunch of unneeded comments from modules
  // that get pruned.
  mode: 'production',
  entry: {
    '10ten-ja-content': './src/content.ts',
    '10ten-ja-background': './src/background.ts',
    '10ten-ja-options': './src/options.ts',
    '10ten-ja-jpdict': './src/jpdict-worker.ts',
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            defaults: false,
            unused: true,
          },
          mangle: false,
          format: {
            beautify: true,
            comments: 'all',
            indent_level: 2,
            keep_numbers: true,
          },
        },
      }),
    ],
  },
};

const firefoxConfig = buildExtConfig({
  distFolder: 'dist-firefox',
  supportsAlphaVersion: true,
  supportsApplicationsField: true,
  supportsBrowserStyle: true,
  supportsMatchAboutBlank: true,
  supportsSvgIcons: true,
  supportsTabContextType: true,
  target: 'firefox',
});

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
        publicPath: `https://github.com/birchill/10ten-ja-reader/releases/download/v${pjson.version}/`,
        overwrite: true,
      },
      {}
    )
  );
}

const chromeConfig = buildExtConfig({
  distFolder: 'dist-chrome',
  needsClipboardWrite: false,
  supportsChromeStyle: true,
  supportsMatchAboutBlank: true,
  target: 'chromium',
});

const edgeConfig = buildExtConfig({
  distFolder: 'dist-edge',
  needsClipboardWrite: false,
  supportsMatchAboutBlank: true,
  target: 'chromium',
  usesEdgeStore: true,
});

const safariConfig = buildExtConfig({
  activeTabOnly: true,
  // Safari defaults to loading JS as Latin so make sure we add a UTF-8 BOM
  addBom: true,
  distFolder: 'dist-safari',
  supportsBrowserStyle: true,
  useEventPage: true,
});

module.exports = (env) => {
  let configs = [testConfig];
  if (env && env.target === 'chrome') {
    configs.push({ ...chromeConfig, name: 'extension' });
  } else if (env && env.target === 'edge') {
    configs.push({ ...edgeConfig, name: 'extension' });
  } else if (env && env.target === 'safari') {
    configs.push({ ...safariConfig, name: 'extension' });
  } else {
    configs.push({ ...firefoxConfig, name: 'extension' });
  }

  return configs;
};

function buildExtConfig({
  addBom = false,
  activeTabOnly = false,
  distFolder,
  needsClipboardWrite = true,
  supportsAlphaVersion = false,
  supportsApplicationsField = false,
  supportsBrowserStyle = false,
  supportsChromeStyle = false,
  supportsMatchAboutBlank = false,
  supportsSvgIcons = false,
  supportsTabContextType = false,
  target,
  usesEdgeStore = false,
  useEventPage = false,
}) {
  const preprocessorFeatures = [];

  if (activeTabOnly) {
    preprocessorFeatures.push('active_tab_only');
  }

  if (needsClipboardWrite) {
    preprocessorFeatures.push('needs_clipboard_write');
  }

  if (supportsAlphaVersion) {
    preprocessorFeatures.push('supports_alpha_version');
  }

  if (supportsApplicationsField) {
    preprocessorFeatures.push('supports_applications_field');
  }

  if (supportsBrowserStyle) {
    preprocessorFeatures.push('supports_browser_style');
  }

  if (supportsChromeStyle) {
    preprocessorFeatures.push('supports_chrome_style');
  }

  if (supportsMatchAboutBlank) {
    preprocessorFeatures.push('supports_match_about_blank');
  }

  if (supportsSvgIcons) {
    preprocessorFeatures.push('supports_svg_icons');
  }

  if (usesEdgeStore) {
    preprocessorFeatures.push('uses_edge_store');
  }

  if (useEventPage) {
    preprocessorFeatures.push('use_event_page');
  }

  const plugins = [
    new webpack.DefinePlugin({
      __ACTIVE_TAB_ONLY__: activeTabOnly,
      __SUPPORTS_SVG_ICONS__: supportsSvgIcons,
      __SUPPORTS_TAB_CONTEXT_TYPE__: supportsTabContextType,
      __VERSION__: `'${pjson.version}'`,
    }),
  ];

  if (activeTabOnly) {
    plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /all-tab-manager$/,
        path.resolve(__dirname, 'src', 'active-tab-manager.ts')
      )
    );
  }

  if (addBom) {
    plugins.push(new BomPlugin(true));
  }

  const copyPatterns = [
    // Despite the fact that we inject popup.css directly into the
    // content script, we still package it as a separate file in the add-on
    // so that we can load it in the options page.
    //
    // One day we might decide to inject popup.css into the options page
    // script too, but for now we duplicate this content.
    'css/*',
    supportsSvgIcons ? 'images/*.svg' : 'images/*',
    'data/*',
    '_locales/**/*',
  ];

  plugins.push(new CopyWebpackPlugin({ patterns: copyPatterns }));

  if (target === 'firefox') {
    plugins.push(
      new WebExtPlugin({
        firefox,
        firefoxProfile,
        keepProfileChanges,
        profileCreateIfMissing,
        startUrl: ['tests/playground.html'],
        sourceDir: path.resolve(__dirname, distFolder),
      })
    );
  } else if (target === 'chromium') {
    plugins.push(
      new WebExtPlugin({
        chromiumBinary: chromium,
        chromiumProfile,
        firefoxProfile,
        keepProfileChanges,
        profileCreateIfMissing,
        startUrl: [path.resolve(__dirname, 'tests', 'playground.html')],
        sourceDir: path.resolve(__dirname, distFolder),
        target: 'chromium',
      })
    );
  } else {
    plugins.push(
      new WebExtPlugin({ sourceDir: path.resolve(__dirname, distFolder) })
    );
  }

  return {
    ...commonExtConfig,
    module: {
      ...commonExtConfig.module,
      rules: extendArray(
        commonExtConfig.module.rules,
        getPreprocessorConfig(...preprocessorFeatures)
      ),
    },
    output: {
      path: path.resolve(__dirname, distFolder),
      filename: '[name].js',
    },
    plugins,
  };
}

function getPreprocessorConfig(...features) {
  return {
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
  };
}

function extendArray(array, ...newElems) {
  const result = array.slice();
  result.push(...newElems);
  return result;
}
