import * as console from 'node:console';
import * as fs from 'node:fs';
import * as url from 'node:url';

import { formatReleaseNotes } from './release-notes/format-release-notes.js';

async function main() {
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
  const changeLogContents = fs.readFileSync(changeLogPath, 'utf8');
  const rawNotes = formatReleaseNotes({
    changeLog: changeLogContents,
    version,
  });

  console.log(formatPreview({ rawNotes, version }));
}

function formatPreview({ rawNotes, version }) {
  const match = rawNotes.match(/\n\n<!--\n([\s\S]*?)\n-->$/);
  const githubNotes = match
    ? rawNotes.slice(0, match.index).trimEnd()
    : rawNotes;
  const storeNotes = match?.[1]?.trimEnd();

  return [
    `## Release notes preview for ${version}`,
    '',
    '### GitHub release notes',
    '',
    githubNotes,
    '',
    '### Store submission notes',
    '',
    storeNotes
      ? ['```text', storeNotes, '```'].join('\n')
      : '_No store notes found._',
  ].join('\n');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
