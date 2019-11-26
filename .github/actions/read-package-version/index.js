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

  console.log(`Version is: ${versionString}`);
  core.setOutput('version', versionString);

  const { major, minor, patch, pre, matches } = parseSemVer(versionString);
  if (!matches) {
    core.setFailed(`Could not parse version: ${versionString}`);
    process.exit(1);
  }

  const firefoxPackageName = `rikaichamp-${major}.${minor}.${patch}${pre}.zip`;
  console.log(`Firefox package name: ${firefoxPackageName}`);
  core.setOutput('firefoxPackageName', firefoxPackageName);

  const chromePackageName = `rikaichamp-${major}.${minor}.${patch}.zip`;
  console.log(`Chrome package name: ${chromePackageName}`);
  core.setOutput('chromePackageName', chromePackageName);

  console.log(`Pre-release status: ${!!pre}`);
  core.setOutput('prerelease', !!pre);
} catch (error) {
  core.setFailed(error.message);
}
