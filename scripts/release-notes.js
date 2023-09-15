import * as console from 'node:console';
import * as fs from 'node:fs';
import * as process from 'node:process';
import * as url from 'node:url';

import { formatReleaseNotes } from './release-notes/format-release-notes.js';

async function main() {
  let version = process.argv[2];
  if (version && version.startsWith('v')) {
    version = version.slice(1);
  }

  if (!version) {
    version = 'Unreleased';
  }

  const changeLogPath = url.fileURLToPath(
    new URL('../CHANGELOG.md', import.meta.url)
  );
  const changeLogContents = fs.readFileSync(changeLogPath, 'utf8');

  const releaseNotes = formatReleaseNotes({
    changeLog: changeLogContents,
    version,
  });

  console.log(releaseNotes);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
