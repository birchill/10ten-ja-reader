// Bugsnag release steps, run from .github/workflows/release.yml.
//
// These used to be BugsnagBuildReporterPlugin and
// BugsnagSourceMapUploaderPlugin in rspack.config.js. The sourcemap plugin is
// incompatible with Rspack 2 because it expects
// `compilation.getStats().toJson().chunks` to be present. Calling the Bugsnag
// CLI after the build also means upload failures fail the release job instead
// of being swallowed by the plugin.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';

import pjson from '../package.json' with { type: 'json' };
import { BUGSNAG_NOTIFIER_API_KEY } from '../src/utils/bugsnag-api-key.js';

const command = process.argv[2];

function getCommand() {
  switch (command) {
    case 'report-build': {
      const repository = process.env.GITHUB_REPOSITORY;
      const revision = process.env.BUGSNAG_BUILD_REVISION;

      if (!repository || !revision) {
        console.error(
          '[bugsnag] GITHUB_REPOSITORY and BUGSNAG_BUILD_REVISION must be set to report a build.'
        );
        process.exit(1);
      }

      return {
        apiKey: BUGSNAG_NOTIFIER_API_KEY,
        args: [
          'create-build',
          '--provider=github',
          `--repository=https://github.com/${repository}`,
          `--revision=${revision}`,
        ],
      };
    }

    case 'upload-sourcemaps': {
      const apiKey = process.env.BUGSNAG_UPLOAD_API_KEY;
      if (!apiKey) {
        console.error(
          '[bugsnag] BUGSNAG_UPLOAD_API_KEY must be set to upload sourcemaps.'
        );
        process.exit(1);
      }

      return {
        apiKey,
        args: [
          'upload',
          'js',
          `--base-url=https://github.com/birchill/10ten-ja-reader/releases/download/v${pjson.version}/`,
          `--project-root=${process.cwd()}`,
          '--overwrite',
          'dist-firefox',
        ],
      };
    }

    default:
      console.error(
        `[bugsnag] Unknown command "${command}". Expected report-build or upload-sourcemaps.`
      );
      process.exit(1);
  }
}

const { apiKey, args } = getCommand();
const require = createRequire(import.meta.url);
const cli = path.join(
  path.dirname(require.resolve('@bugsnag/cli/package.json')),
  'bin',
  'bugsnag-cli'
);

const { status, error } = spawnSync(
  cli,
  [...args, `--api-key=${apiKey}`, `--version-name=${pjson.version}`],
  { stdio: 'inherit' }
);

if (error) {
  console.error(`[bugsnag] Failed to run ${cli}:`, error.message);
  process.exit(1);
}

process.exit(status ?? 1);
