import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseSemVer } from 'semver-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  const firefoxPackageName = `10ten_japanese_reader_rikaichamp_-${major}.${minor}.${patch}${
    pre || ''
  }.zip`;
  console.log(`Firefox package name: ${firefoxPackageName}`);
  core.setOutput('firefox_package_name', firefoxPackageName);

  const chromePackageName = `10ten_japanese_reader_rikaichamp_-${major}.${minor}.${patch}.zip`;
  console.log(`Chrome package name: ${chromePackageName}`);
  core.setOutput('chrome_package_name', chromePackageName);

  const edgePackageName = `10ten_japanese_reader_rikaichamp_-${major}.${minor}.${patch}.zip`;
  console.log(`Edge package name: ${edgePackageName}`);
  core.setOutput('edge_package_name', edgePackageName);

  console.log(`Pre-release status: ${!!pre}`);
  core.setOutput('prerelease', !!pre);
} catch (error) {
  core.setFailed(error.message);
}
