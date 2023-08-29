// @ts-check
import * as core from '@actions/core';
import * as fs from 'node:fs';
import * as process from 'node:process';
import * as url from 'node:url';

import { formatReleaseNotes } from './format-release-notes.js';

async function main() {
  const version = core.getInput('version').toLowerCase();

  const workspace = /** @type string */ (process.env.GITHUB_WORKSPACE);
  const changeLogPath = url.fileURLToPath(new URL('CHANGELOG.md', workspace));
  const changeLogContents = fs.readFileSync(changeLogPath, 'utf8');

  const releaseNotes = formatReleaseNotes({
    changeLog: changeLogContents,
    version,
  });

  core.setOutput('text', releaseNotes);
}

main().catch((error) => {
  core.setFailed(error.message);
});
