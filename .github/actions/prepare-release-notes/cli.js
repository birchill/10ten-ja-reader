const fs = require('fs');
const path = require('path');

const { formatReleaseNotes } = require('./format-release-notes.js');

async function main() {
  let version = process.argv[2];
  if (version && version.startsWith('v')) {
    version = version.slice(1);
  }

  if (!version) {
    version = 'Unreleased';
  }

  const root = path.join(__dirname, '..', '..', '..');

  const changeLogPath = path.join(root, 'CHANGELOG.md');
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
