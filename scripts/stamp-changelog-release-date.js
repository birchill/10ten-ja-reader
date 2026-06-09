import * as fs from 'node:fs';
import * as url from 'node:url';

import {
  browsers,
  getReleaseTargets,
} from './release-notes/format-release-notes.js';

// Stamps the Keep a Changelog release date onto the current version's changelog
// heading at release time, e.g.
//
//   ## 1.28.0  ->  ## [1.28.0] - 2026-06-08
//
// During `changeset version` the new release heading is left in its plain
// `## <version>` form (see `postprocess-changeset-changelog.js` for why).
//
// If the release only targets a subset of browsers (because every note is
// annotated to exclude the others) a human-readable annotation is appended too,
// e.g.
//
//   ## [1.28.0] - 2026-06-08 (Firefox, Thunderbird only)
//
// This annotation is purely for the historical record—the actual set of stores
// a release is published to is driven by which browsers have notes, not by this
// text. If the heading has already been stamped (or isn't present) the
// changelog is left unchanged.

/**
 * Rewrites the plain `## <version>` heading into the dated Keep a Changelog
 * form, appending a `(… only)` annotation when the release targets a subset of
 * browsers.
 *
 * @param {{ changeLog: string; version: string; date: string }} options
 * @returns {string}
 */
export function stampChangelogReleaseDate({ changeLog, version, date }) {
  const headingRe = new RegExp(`^## ${escapeRegExp(version)}$`, 'm');
  if (!headingRe.test(changeLog)) {
    // Already stamped (or the heading isn't present) — nothing to do.
    return changeLog;
  }

  const annotation = formatTargetAnnotation(
    getReleaseTargets({ changeLog, version })
  );

  return changeLog.replace(headingRe, `## [${version}] - ${date}${annotation}`);
}

// Returns a human-readable ` (… only)` annotation when the release targets a
// strict subset of browsers, or '' when it targets all of them.
function formatTargetAnnotation(targets) {
  if (!targets.length || targets.length === browsers.length) {
    return '';
  }
  return ` (${targets.join(', ')} only)`;
}

function main() {
  const packageJsonPath = url.fileURLToPath(
    new URL('../package.json', import.meta.url)
  );
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  if (!version) {
    throw new Error('Could not find version in package.json');
  }

  const changeLogPath = url.fileURLToPath(
    new URL('../CHANGELOG.md', import.meta.url)
  );
  const original = fs.readFileSync(changeLogPath, 'utf8');
  const date = new Date().toISOString().slice(0, 10);
  const updated = stampChangelogReleaseDate({
    changeLog: original,
    version,
    date,
  });

  if (updated === original) {
    console.log(
      `No plain "## ${version}" heading to stamp; leaving CHANGELOG.md unchanged.`
    );
    return;
  }

  fs.writeFileSync(changeLogPath, updated, 'utf8');
  const heading = updated.match(
    new RegExp(`^## \\[${escapeRegExp(version)}\\].*$`, 'm')
  )?.[0];
  console.log(`Stamped CHANGELOG.md heading: ${heading}`);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Only run the CLI when invoked directly (not when imported by tests).
if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
