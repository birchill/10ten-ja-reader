import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'node:fs';
import * as url from 'node:url';

async function main() {
  const { formatReleaseNotes } = await import(
    new URL('format-release-notes.js', import.meta.url)
  );

  const version = core.getInput('version').toLowerCase();

  const changeLogPath = url.fileURLToPath(
    new URL('CHANGELOG.md', github.context.workspace)
  );
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
