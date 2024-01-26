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
    // React Cosmos decorators
    'src/**/cosmos.decorator.tsx',
    // Included by popups.html until we set up a better way of doing component
    // tests.
    'tests/html-tests.js',
    // This is referenced in xcode13/Shared (App)/Base.lproj/Main.html but knip
    // doesn't know how to parse that.
    'xcode13/Shared \\(App\\)/Resources/Script.js',
  ],
  ignore: [
    // Ignore React Cosmos fixtures
    'src/**/*.fixture.tsx',
  ],
  ignoreDependencies: [
    // Used by our browser test and automatically detected by playwright-test.
    'mocha',
    '@types/mocha',
    // Knip doesn't know how to parse React Cosmos plugins (yet).
    'react-cosmos-plugin-webpack',
    // Since Husky 9, knip fails to find husky dependencies
    'lint-staged',
  ],
  ignoreExportsUsedInFile: {
    interface: true,
    type: true,
  },
  playwright: {
    // Knip doesn't recognize the globs in package.json scripts
    entry: 'tests/**/*.test.{js,ts}',
  },
  postcss: {
    // Knip doesn't look for .cjs files by default.
    config: ['postcss.config.cjs'],
  },
  tailwind: {
    config: ['**/tailwind.config.js'],
  },
  webpack: {
    // Knip won't know to look for the special (cosmos-webpack.config.js) file.
    config: ['cosmos-webpack.config.js', 'webpack.config.js'],
  },
};

export default config;
