const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

const { formatReleaseNotes } = require('./format-release-notes');

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
