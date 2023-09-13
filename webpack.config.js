/* eslint-env node */
/* eslint @typescript-eslint/no-var-requires: 0 */
import CopyWebpackPlugin from 'copy-webpack-plugin';
import * as path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import { fileURLToPath } from 'url';
import WebExtPlugin from 'web-ext-plugin';
import webpack from 'webpack';
import {
  BugsnagBuildReporterPlugin,
  BugsnagSourceMapUploaderPlugin,
} from 'webpack-bugsnag-plugins';
import BomPlugin from 'webpack-utf8-bom';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pjson = require('./package.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
const buildPackage = !!env.package;

const commonConfig = {
  mode: 'development',
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
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
    },
    extensions: ['.ts', '.tsx', '.js'],
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
  // Russian token stopwords into the content script.
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
    '10ten-ja-content': './src/content/content.ts',
    '10ten-ja-gdocs-bootstrap': './src/content/gdocs-bootstrap.ts',
    '10ten-ja-background': './src/background/background.ts',
    '10ten-ja-options': './src/options/options.ts',
    '10ten-ja-jpdict': './src/worker/jpdict-worker.ts',
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
            // Chrome sometimes doesn't like the generated output claiming it's
            // not valid UTF-8 (it is) so we need to force ASCII output.
            ascii_only: true,
            beautify: true,
            // Drop any embedded source mapping URLs but preserve other comments
            // (superstruct has these, for example)
            comments: /^(?!# sourceMappingURL=)/,
            indent_level: 2,
            keep_numbers: true,
          },
        },
      }),
    ],
  },
};

const firefoxConfig = buildExtConfig({
  artifactsDir: 'dist-firefox-package',
  distFolder: 'dist-firefox',
  includeRikaichampName: true,
  supportsAlphaVersion: true,
  supportsBrowserSpecificSettings: true,
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
  artifactsDir: 'dist-chrome-package',
  distFolder: 'dist-chrome',
  includeRikaichampName: true,
  isChrome: true,
  needsClipboardWrite: false,
  supportsExtensionSourceMaps: false,
  supportsMatchAboutBlank: true,
  supportsOfflineEnabledField: true,
  target: 'chromium',
});

const edgeConfig = buildExtConfig({
  artifactsDir: 'dist-edge-package',
  distFolder: 'dist-edge',
  includeRikaichampName: true,
  isEdge: true,
  needsClipboardWrite: false,
  supportsExtensionSourceMaps: false,
  supportsMatchAboutBlank: true,
  target: 'chromium',
});

const safariConfig = buildExtConfig({
  activeTabOnly: true,
  // Safari defaults to loading JS as Latin so make sure we add a UTF-8 BOM
  addBom: true,
  artifactsDir: 'dist-safari-package',
  distFolder: 'dist-safari',
  isSafari: true,
  supportsBrowserSpecificSettings: true,
  supportsBrowserStyle: true,
  supportsExtensionSourceMaps: false,
  useEventPage: true,
});

const thunderbirdConfig = buildExtConfig({
  artifactsDir: 'dist-thunderbird-package',
  distFolder: 'dist-thunderbird',
  includeRikaichampName: true,
  mailExtension: true,
  supportsAlphaVersion: true,
  supportsBrowserSpecificSettings: true,
  supportsBrowserStyle: true,
  supportsSvgIcons: true,
  supportsTabContextType: true,
});

export default (env) => {
  const configs = [testConfig];
  if (env && env.target === 'chrome') {
    configs.push({ ...chromeConfig, name: 'extension' });
  } else if (env && env.target === 'edge') {
    configs.push({ ...edgeConfig, name: 'extension' });
  } else if (env && env.target === 'safari') {
    configs.push({ ...safariConfig, name: 'extension' });
  } else if (env && env.target === 'thunderbird') {
    configs.push({ ...thunderbirdConfig, name: 'extension' });
  } else {
    configs.push({ ...firefoxConfig, name: 'extension' });
  }

  return configs;
};

function buildExtConfig({
  activeTabOnly = false,
  addBom = false,
  artifactsDir,
  distFolder,
  isChrome = false,
  isEdge = false,
  isSafari = false,
  includeRikaichampName = false,
  mailExtension = false,
  mv3 = false,
  needsClipboardWrite = true,
  supportsAlphaVersion = false,
  supportsBrowserSpecificSettings = false,
  supportsBrowserStyle = false,
  supportsExtensionSourceMaps = true,
  supportsMatchAboutBlank = false,
  supportsOfflineEnabledField = false,
  supportsSvgIcons = false,
  supportsTabContextType = false,
  target,
  useEventPage = false,
  useServiceWorker = false,
}) {
  const preprocessorFeatures = [];

  if (activeTabOnly) {
    preprocessorFeatures.push('active_tab_only');
  }

  if (includeRikaichampName) {
    preprocessorFeatures.push('include_rikaichamp_name');
  }

  if (isChrome) {
    preprocessorFeatures.push('is_chrome');
  }

  if (isEdge) {
    preprocessorFeatures.push('is_edge');
  }

  if (isSafari) {
    preprocessorFeatures.push('is_safari');
  }

  if (mailExtension) {
    preprocessorFeatures.push('mail_extension');
  }

  if (mv3) {
    preprocessorFeatures.push('mv3');
  }

  if (needsClipboardWrite) {
    preprocessorFeatures.push('needs_clipboard_write');
  }

  if (supportsAlphaVersion) {
    preprocessorFeatures.push('supports_alpha_version');
  }

  if (supportsBrowserSpecificSettings) {
    preprocessorFeatures.push('supports_browser_specific_settings');
  }

  if (supportsBrowserStyle) {
    preprocessorFeatures.push('supports_browser_style');
  }

  if (supportsMatchAboutBlank) {
    preprocessorFeatures.push('supports_match_about_blank');
  }

  if (supportsOfflineEnabledField) {
    preprocessorFeatures.push('supports_offline_enabled_field');
  }

  if (supportsSvgIcons) {
    preprocessorFeatures.push('supports_svg_icons');
  }

  if (useEventPage) {
    preprocessorFeatures.push('use_event_page');
  }

  if (useServiceWorker) {
    preprocessorFeatures.push('use_service_worker');
  }

  const plugins = [
    new webpack.DefinePlugin({
      __ACTIVE_TAB_ONLY__: activeTabOnly,
      __MV3__: mv3,
      __SUPPORTS_SVG_ICONS__: supportsSvgIcons,
      __SUPPORTS_TAB_CONTEXT_TYPE__: supportsTabContextType,
      __VERSION__: `'${pjson.version}'`,
    }),
  ];

  if (activeTabOnly) {
    plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /all-tab-manager$/,
        path.resolve(__dirname, 'src', 'background', 'active-tab-manager.ts')
      )
    );
  }

  if (addBom) {
    plugins.push(new BomPlugin(true));
  }

  // Safari and Chrome struggle with extension URL source maps.
  //
  // For Safari, if it sees the sourceMappingURL it will report a
  // "Cocoa error -1008" every time we inject the content script.
  //
  // For Chrome, it will report:
  //
  // > DevTools failed to load source map: Could not load content for
  // > chrome-extension://.../10ten-ja-content.js.map:
  // > HTTP error: status code 404, net::ERR_UNKNOWN_URL_SCHEME
  //
  // For these browsers we turn off source maps in release builds (as it is, we
  // currently only upload the Firefox source maps anyway) and use inline source
  // maps for debug builds.
  //
  // Note that if we simply want to drop the "sourceMappingURL" _comment_ and
  // only drop it for the content script (which is what we used to do), we
  // can achieve that by setting `devtool` to false and then doing:
  //
  //  plugins.push(
  //    new webpack.SourceMapDevToolPlugin({
  //      test: /.js$/,
  //      exclude: '10ten-ja-content.js',
  //      filename: '[file].map',
  //      noSources: false,
  //    })
  //  );
  //  plugins.push(
  //    new webpack.SourceMapDevToolPlugin({
  //      test: '10ten-ja-content.js',
  //      filename: '[file].map',
  //      noSources: false,
  //      append: false,
  //    })
  //  );
  //
  let devtool = 'source-map';
  if (!supportsExtensionSourceMaps) {
    devtool = process.env.RELEASE_BUILD ? false : 'inline-source-map';
  }

  const copyPatterns = [
    // Despite the fact that we inject popup.css directly into the
    // content script, we still package it as a separate file in the add-on
    // so that we can load it in the options page.
    //
    // One day we might decide to inject popup.css into the options page
    // script too, but for now we duplicate this content.
    'css/*',
    { from: '*.html', context: 'html' },
    supportsSvgIcons ? 'images/*.svg' : 'images/*',
    'data/*',
    '_locales/**/*',
    // Update page assets
    { from: 'docs/update/update.css', to: 'docs' },
    { from: '*.html', context: 'docs/update', to: 'docs' },
    { from: '*.png', context: 'docs/update/img', to: 'docs/img' },
    { from: '*.js', context: 'docs/update', to: 'docs' },
  ];

  plugins.push(new CopyWebpackPlugin({ patterns: copyPatterns }));

  let webExtOptions = {
    artifactsDir,
    buildPackage,
    overwriteDest: true,
    sourceDir: path.resolve(__dirname, distFolder),
  };

  if (target === 'firefox') {
    webExtOptions = {
      ...webExtOptions,
      firefox,
      firefoxProfile,
      keepProfileChanges,
      profileCreateIfMissing,
      startUrl: ['tests/playground.html'],
    };
  } else if (target === 'chromium') {
    webExtOptions = {
      ...webExtOptions,
      chromiumBinary: chromium,
      chromiumProfile,
      startUrl: [path.resolve(__dirname, 'tests', 'playground.html')],
      // web-ext lint doesn't yet handle some of the chromium MV3 manifest
      // like allowing a service worker background script or having an empty
      // extension ID.
      runLint: false,
      target: 'chromium',
    };
  } else if (target === 'edge') {
    // web-ext lint doesn't yet handle some of the chromium MV3 manifest like
    // allowing a service worker background script or having an empty
    // extension ID.
    webExtOptions.runLint = false;
  }

  plugins.push(new WebExtPlugin(webExtOptions));

  return {
    ...commonExtConfig,
    devtool,
    module: {
      ...commonExtConfig.module,
      rules: [
        ...commonExtConfig.module.rules,
        getPreprocessorConfig(...preprocessorFeatures),
      ],
    },
    output: {
      path: path.resolve(__dirname, distFolder),
      publicPath: '/',
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
