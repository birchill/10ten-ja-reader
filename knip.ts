import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    // knip's GitHub actions plugin doesn't know how to recognize custom actions
    // yet.
    '.github/actions/parse-release/index.js',
    // Utility script used by update docs pages.
    'docs/update/update.js',
    // A utility we used to generate all the icon variations once that might yet
    // be useful again some day.
    'scripts/generate-icons.ts',
    // This file is conditionally included in some configurations in a way knip
    // can't be expected to follow. Hopefully we'll eventually remove this
    // quirk and use the same tab manager everywhere.
    'src/background/active-tab-manager.ts',
    // Included by popups.html until we set up a better way of doing component
    // tests.
    'tests/html-tests.js',
    // Likewise for options.html
    'tests/options.js',
    // This is referenced in xcode13/Shared (App)/Base.lproj/Main.html but knip
    // doesn't know how to parse that.
    'xcode13/Shared \\(App\\)/Resources/Script.js',
  ],
  ignore: [
    // The tailwind config file is just here for when we need to manually update
    // the docs.
    'docs/update/tailwind.config.js',
  ],
  ignoreDependencies: [
    // Used by our browser test and automatically detected by playwright-test.
    'mocha',
    '@types/mocha',
  ],
  webpack: {
    // I think there may be a bug in knip where if you specify webpack config at
    // all (e.g. just to specify the `entry` member), the `config` member
    // defaults to `[]` and hence knip won't use it's default path for finding
    // the webpack config. So we have to specify it explicitly.
    config: 'webpack.config.js',
    entry: [
      // Our webpack setup is very complicated. It's not surprising knip can't
      // untagle it.
      'webpack.config.js',
      'tests/content-loader.ts',
      'src/content/content.ts',
      'src/content/gdocs-bootstrap.ts',
      'src/background/background.ts',
      'src/options/options.ts',
      'src/worker/jpdict-worker.ts',
    ],
  },
};

export default config;
