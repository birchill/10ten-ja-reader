const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const { parseSemVer } = require('semver-parser');

try {
  const packageJson = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'package.json'),
      'utf8'
    )
  );
  const versionString = packageJson.version;
  if (!versionString) {
    core.setFailed('Could not find version in package.json');
    process.exit(1);
  }

  console.log(`Version is: ${version}`);
  core.setOutput('version', versionString);

  const { major, minor, patch, pre } = parseSemVer(versionString);
  core.setOutput('prerelease', !!pre);
  console.log(`Pre-release status: ${!!pre}`);
} catch (error) {
  core.setFailed(error.message);
}
