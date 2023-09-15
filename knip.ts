import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    // Utility script used by update docs pages
    'docs/update/update.js',
    // This file is conditionally included in some configurations in a way knip
    // can't be expected to follow. Hopefully we'll eventually remove this
    // quirk and use the same tab manager everywhere.
    'src/background/active-tab-manager.ts',
    // Included by popups.html until we set up a better way of doing component
    // tests
    'tests/html-tests.js',
    // Likewise for options.html
    'tests/options.js',
  ],
  ignore: [
    // knip's GitHub actions plugin doesn't know how to handle custom actions
    // yet and we'll possibly drop this in future so we just ignore it for now.
    '.github/actions/parse-release/index.js',
    // The tailwind config file is just here for when we need to manually update
    // the docs.
    'docs/update/tailwind.config.js',
  ],
  webpack: {
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
