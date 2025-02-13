import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
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
    // This is referenced in xcode13/Shared (App)/Base.lproj/Main.html but knip
    // doesn't know how to parse that.
    'xcode13/Shared \\(App\\)/Resources/Script.js',
  ],
  ignore: [
    // Ignore conditionally-compiled i18n polyfill
    'src/common/i18n.polyfill.tsx',
    // Ignore the locale files compiled by the i18n polyfill
    'tests/_locales_*.js',
  ],
  ignoreDependencies: [
    // Used by our browser test and automatically detected by playwright-test.
    'mocha',
    '@types/mocha',
  ],
  ignoreExportsUsedInFile: { interface: true, type: true },
  playwright: {
    // Knip doesn't recognize the globs in package.json scripts
    entry: 'tests/**/*.test.{js,ts}',
    config: 'playwright-test.config.js',
  },
  tailwind: { config: ['**/tailwind.config.js'] },
};

export default config;
