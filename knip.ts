import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    // A utility we used to generate all the icon variations once that might yet
    // be useful again some day.
    'scripts/generate-icons.ts',
    // No current build uses activeTab mode, but keep this manager as a starting
    // point for a possible opt-in, least-privilege permission mode.
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
  ],
  ignoreFiles: [
    'css/selection.css',
    'xcode13/Shared (App)/Resources/Style.css',
  ],
  ignoreDependencies: [
    // Used by our browser test and automatically detected by playwright-test.
    'mocha',
    '@types/mocha',
  ],
  ignoreExportsUsedInFile: { interface: true, type: true },
};

export default config;
