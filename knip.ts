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
    // Ignore React Cosmos fixtures.
    'src/**/*.fixture.tsx',
  ],
  ignoreDependencies: [
    // Used by our browser test and automatically detected by playwright-test.
    'mocha',
    '@types/mocha',
    // Used by React Cosmos
    'react',
    'react-dom',
    // React Cosmos plugins (which knip doesn't know how to parse yet)
    'react-cosmos-plugin-webpack',
    // Plugins required by React Cosmos but not explicitly referenced
    'html-webpack-plugin',
  ],
  ignoreExportsUsedInFile: {
    interface: true,
    type: true,
  },
  playwright: {
    // Knip doesn't recognize the globs in package.json scripts
    entry: 'tests/**/*.test.{js,ts}',
  },
  webpack: {
    entry: [
      // Webpack config used by React Cosmos
      'cosmos-webpack.config.js',
    ],
  },
};

export default config;
