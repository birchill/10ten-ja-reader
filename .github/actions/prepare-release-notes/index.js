import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';

import { formatReleaseNotes } from './format-release-notes';

async function main() {
  const version = core.getInput('version').toLowerCase();
  const root = path.join(__dirname, '..', '..', '..');

  const changeLogPath = path.join(root, 'CHANGELOG.md');
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
