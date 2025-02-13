/* eslint @typescript-eslint/no-var-requires: 0 */
import rspack from '@rspack/core';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import TerserPlugin from 'terser-webpack-plugin';
import WebExtPlugin from 'web-ext-plugin';
import {
  BugsnagBuildReporterPlugin,
  BugsnagSourceMapUploaderPlugin,
} from 'webpack-bugsnag-plugins';
import BomPlugin from 'webpack-utf8-bom';

import pjson from './package.json' with { type: 'json' };

//
// __dirname shim
//

const __dirname = path.dirname(fileURLToPath(import.meta.url));

//
// Env arguments processing
//

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
        oneOf: [
          {
            resourceQuery: '?inline',
            type: 'asset/source',
            use: ['postcss-loader'],
          },
          {
            type: 'javascript/auto',
            // We need to use the CssExtractRspackPlugin.loader here (as opposed
            // to Rspack's native CSS handling) simply to that we can tell
            // css-loader not to parser URLs or generate source maps.
            use: [
              { loader: rspack.CssExtractRspackPlugin.loader },
              {
                loader: 'css-loader',
                options: { url: false, sourceMap: false },
              },
              'postcss-loader',
            ],
          },
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
    },
    extensions: ['.ts', '.tsx', '.js'],
  },
};

//
// Test configuration
//

const testConfig = {
  ...commonConfig,
  name: 'tests',
  entry: { 'content-loader': './tests/content-loader.ts' },
  output: { path: path.resolve(__dirname, 'tests'), filename: '[name].js' },
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
  ],
};

//
// Exported configurations
//

export default (env) => {
  const configs = [testConfig];

  if (env && env.target === 'chrome') {
    configs.push(
      getExtConfig({
        artifactsDir: 'dist-chrome-package',
        distFolder: 'dist-chrome',
        includeRikaichampName: true,
        isChrome: true,
        mv3: true,
        needsClipboardWrite: false,
        optionsInTab: true,
        supportsExtensionSourceMaps: false,
        supportsMatchAboutBlank: true,
        supportsOfflineEnabledField: true,
        target: 'chromium',
        useServiceWorker: true,
      })
    );
  } else if (env && env.target === 'chrome-electron') {
    configs.push(
      getExtConfig({
        artifactsDir: 'dist-chrome-electron-package',
        distFolder: 'dist-chrome-electron',
        includeRikaichampName: true,
        isChrome: true,
        mv3: false,
        needsClipboardWrite: false,
        optionsInTab: true,
        supportsExtensionSourceMaps: false,
        supportsMatchAboutBlank: true,
        supportsOfflineEnabledField: true,
        target: 'chromium',
        useServiceWorker: false,
      })
    );
  } else if (env && env.target === 'edge') {
    configs.push(
      getExtConfig({
        artifactsDir: 'dist-edge-package',
        distFolder: 'dist-edge',
        includeRikaichampName: true,
        isEdge: true,
        mv3: true,
        needsClipboardWrite: false,
        optionsInTab: true,
        supportsExtensionSourceMaps: false,
        supportsMatchAboutBlank: true,
        target: 'chromium',
        useServiceWorker: true,
      })
    );
  } else if (env && env.target === 'safari') {
    configs.push(
      getExtConfig({
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
      })
    );
  } else if (env && env.target === 'thunderbird') {
    configs.push(
      getExtConfig({
        artifactsDir: 'dist-thunderbird-package',
        distFolder: 'dist-thunderbird',
        includeRikaichampName: true,
        mailExtension: true,
        supportsAlphaVersion: true,
        supportsBrowserSpecificSettings: true,
        supportsBrowserStyle: true,
        supportsSvgIcons: true,
        supportsTabContextType: true,
        useEventPage: true,
      })
    );
  } else {
    configs.push(
      getExtConfig({
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
        uploadToBugsnag: !!process.env.RELEASE_BUILD,
        useEventPage: true,
      })
    );
  }

  return configs;
};

/**
 * @typedef {object} ExtConfigOptions
 * @property {boolean} [activeTabOnly]
 * @property {boolean} [addBom]
 * @property {string} artifactsDir
 * @property {string} distFolder
 * @property {boolean} [isChrome]
 * @property {boolean} [isEdge]
 * @property {boolean} [isSafari]
 * @property {boolean} [includeRikaichampName]
 * @property {boolean} [mailExtension]
 * @property {boolean} [mv3]
 * @property {boolean} [needsClipboardWrite]
 * @property {boolean} [optionsInTab]
 * @property {boolean} [supportsAlphaVersion]
 * @property {boolean} [supportsBrowserSpecificSettings]
 * @property {boolean} [supportsBrowserStyle]
 * @property {boolean} [supportsExtensionSourceMaps]
 * @property {boolean} [supportsMatchAboutBlank]
 * @property {boolean} [supportsOfflineEnabledField]
 * @property {boolean} [supportsSvgIcons]
 * @property {boolean} [supportsTabContextType]
 * @property {string} [target]
 * @property {'extension' | 'lazy-modules'} type
 * @property {boolean} [uploadToBugsnag]
 * @property {boolean} [useEventPage]
 * @property {boolean} [useServiceWorker]
 */

/**
 * @param {ExtConfigOptions} options
 */
function getExtConfig(options) {
  //
  // Pre-processor features
  //

  const preprocessorFeatures = [];

  if (options.activeTabOnly) {
    preprocessorFeatures.push('active_tab_only');
  }

  if (options.includeRikaichampName) {
    preprocessorFeatures.push('include_rikaichamp_name');
  }

  if (options.isChrome) {
    preprocessorFeatures.push('is_chrome');
  }

  if (options.isEdge) {
    preprocessorFeatures.push('is_edge');
  }

  if (options.isSafari) {
    preprocessorFeatures.push('is_safari');
  }

  if (options.mailExtension) {
    preprocessorFeatures.push('mail_extension');
  }

  if (options.mv3) {
    preprocessorFeatures.push('mv3');
  }

  if (options.needsClipboardWrite !== false) {
    preprocessorFeatures.push('needs_clipboard_write');
  }

  if (options.optionsInTab) {
    preprocessorFeatures.push('options_in_tab');
  }

  if (options.supportsAlphaVersion) {
    preprocessorFeatures.push('supports_alpha_version');
  }

  if (options.supportsBrowserSpecificSettings) {
    preprocessorFeatures.push('supports_browser_specific_settings');
  }

  if (options.supportsBrowserStyle) {
    preprocessorFeatures.push('supports_browser_style');
  }

  if (options.supportsMatchAboutBlank) {
    preprocessorFeatures.push('supports_match_about_blank');
  }

  if (options.supportsOfflineEnabledField) {
    preprocessorFeatures.push('supports_offline_enabled_field');
  }

  if (options.supportsSvgIcons) {
    preprocessorFeatures.push('supports_svg_icons');
  }

  if (options.useEventPage) {
    preprocessorFeatures.push('use_event_page');
  }

  if (options.useServiceWorker) {
    preprocessorFeatures.push('use_service_worker');
  }

  //
  // Plugins
  //

  const plugins = [
    new rspack.DefinePlugin({
      __ACTIVE_TAB_ONLY__: !!options.activeTabOnly,
      __MV3__: !!options.mv3,
      __SUPPORTS_SVG_ICONS__: !!options.supportsSvgIcons,
      __SUPPORTS_TAB_CONTEXT_TYPE__: !!options.supportsTabContextType,
      __VERSION__: `'${pjson.version}'`,
    }),
    new ForkTsCheckerWebpackPlugin(),
    new rspack.HtmlRspackPlugin({
      chunks: ['10ten-ja-options'],
      filename: 'options.html',
      minify: false,
      scriptLoading: 'blocking',
      template: './src/options/options.html',
    }),
    new rspack.CssExtractRspackPlugin({
      filename: (pathData) =>
        pathData.chunk.name === '10ten-ja-options'
          ? 'css/options.css'
          : 'css/[name].css',
    }),
  ];

  if (options.activeTabOnly) {
    plugins.push(
      new rspack.NormalModuleReplacementPlugin(
        /all-tab-manager$/,
        path.resolve(__dirname, 'src', 'background', 'active-tab-manager.ts')
      )
    );
  }

  if (options.addBom) {
    plugins.push(new BomPlugin(true));
  }

  //
  // Plugins: CopyWebpackPlugin
  //

  const copyPatterns = [
    'css/*',
    options.supportsSvgIcons ? 'images/*.svg' : 'images/*',
    'data/*',
    'fonts/*',
    '_locales/**/*',
    // Update page assets
    { from: 'docs/update/update.css', to: 'docs' },
    { from: '*.html', context: 'docs/update', to: 'docs' },
    { from: '*.png', context: 'docs/update/img', to: 'docs/img' },
    { from: '*.js', context: 'docs/update', to: 'docs' },
  ];

  plugins.push(new rspack.CopyRspackPlugin({ patterns: copyPatterns }));

  //
  // Plugins: web-ext
  //

  let webExtOptions = {
    artifactsDir: options.artifactsDir,
    buildPackage,
    overwriteDest: true,
    sourceDir: path.resolve(__dirname, options.distFolder),
  };

  if (options.target === 'firefox') {
    webExtOptions = {
      ...webExtOptions,
      firefox,
      firefoxProfile,
      keepProfileChanges,
      profileCreateIfMissing,
      startUrl: ['tests/playground.html'],
    };
  } else if (options.target === 'chromium') {
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
  } else if (options.target === 'edge') {
    // web-ext lint doesn't yet handle some of the chromium MV3 manifest like
    // allowing a service worker background script or having an empty
    // extension ID.
    webExtOptions.runLint = false;
  }

  plugins.push(new WebExtPlugin(webExtOptions));

  //
  // Plugins: Bugsnag
  //

  if (options.uploadToBugsnag && process.env.BUGSNAG_API_KEY) {
    plugins.push(
      new BugsnagBuildReporterPlugin(
        { apiKey: process.env.BUGSNAG_API_KEY, appVersion: pjson.version },
        {}
      )
    );
    plugins.push(
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

  //
  // Devtools
  //

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
  //    new rspack.SourceMapDevToolPlugin({
  //      test: /.js$/,
  //      exclude: '10ten-ja-content.js',
  //      filename: '[file].map',
  //      noSources: false,
  //    })
  //  );
  //  plugins.push(
  //    new rspack.SourceMapDevToolPlugin({
  //      test: '10ten-ja-content.js',
  //      filename: '[file].map',
  //      noSources: false,
  //      append: false,
  //    })
  //  );
  //
  let devtool = 'source-map';
  if (options.supportsExtensionSourceMaps === false) {
    devtool = process.env.RELEASE_BUILD ? false : 'inline-source-map';
  }

  return {
    ...commonConfig,
    name: 'extension',
    devtool,
    entry: {
      '10ten-ja-content': './src/content/content.ts',
      '10ten-ja-gdocs-bootstrap': './src/content/gdocs-bootstrap.ts',
      '10ten-ja-background': './src/background/background.ts',
      '10ten-ja-options': './src/options/options.ts',
      '10ten-ja-jpdict': './src/worker/jpdict-worker.ts',
      // Force the popup.css asset to be created so we can include it in the
      // options page.
      popup: './src/content/popup/popup.css',
    },
    experiments: { css: true },
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
    module: {
      ...commonConfig.module,
      rules: [
        ...commonConfig.module.rules,
        getPreprocessorConfig(...preprocessorFeatures),
      ],
    },
    optimization: {
      minimizer: [
        // In future we should be able to use rspack.SwcJsMinimizerRspackPlugin
        // here instead but currently it doesn't respect some options like
        // 'beautify' so it will produce different output.
        new TerserPlugin({
          terserOptions: {
            compress: { defaults: false, unused: true },
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
    output: {
      clean: true,
      path: path.resolve(__dirname, options.distFolder),
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
      { loader: 'file-loader', options: { name: '[name]' } },
      {
        loader:
          'webpack-preprocessor?' +
          features.map((feature) => `definitions[]=${feature}`).join(','),
      },
    ],
  };
}
