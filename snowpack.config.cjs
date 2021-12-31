// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import('snowpack').SnowpackUserConfig} */
const config = {
  mount: {
    // This explicit mapping of the extension dir to the output dir (dist) is required
    // for path resolution in tests (at least).
    extension: { url: '/' },
  },
  plugins: [
    [
      'snowpack-plugin-replace',
      {
        list: [
          //Remove test only export from rikaicontent
          {
            from: /export.*TestOnly.*\n/,
            to: '',
          },
        ],
      },
    ],
  ],
  buildOptions: {
    out: 'dist',
    // The default _snowpack breaks chrome extensions.
    metaUrlPath: 'snowpack',
    clean: true,
    // The extension HTML files don't have doctype strings so this is required.
    htmlFragments: true,
    // Default to no sourcemaps in prod.
    sourcemap: false,
  },
  testOptions: {
    // Files matching these globs will be excluded by default unless NODE_ENV is set to 'test'
    files: ['**/test/**/*', '**/*_test.*'],
  },
  optimize: {
    // Chrome 80 required for Optional chaining
    // See https://github.com/evanw/esbuild/blob/master/internal/compat/js_table.go
    target: 'chrome80',
  },
};

if (process.env.NODE_ENV === 'test') {
  // Add sourcemaps for easy debugging.
  config.buildOptions.sourcemap = 'inline';
  // Remove plugin which replaces test only exports.
  config.plugins = [];
}

module.exports = config;
