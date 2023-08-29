import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'node:fs';
import * as process from 'node:process';
import * as url from 'node:url';
import { parseSemVer } from 'semver-parser';

try {
  const packageJson = JSON.parse(
    fs.readFileSync(
      url.fileURLToPath(new URL('package.json', github.context.workspace)),
      'utf8'
    )
  );
  const versionString = packageJson.version;
  if (!versionString) {
    core.setFailed('Could not find version in package.json');
    process.exit(1);
  }

  core.info(`Version is: ${versionString}`);
  core.setOutput('version', versionString);

  const { major, minor, patch, pre, matches } = parseSemVer(versionString);
  if (!matches) {
    core.setFailed(`Could not parse version: ${versionString}`);
    process.exit(1);
  }

  const firefoxPackageName = `10ten_japanese_reader_rikaichamp_-${major}.${minor}.${patch}${
    pre || ''
  }.zip`;
  core.info(`Firefox package name: ${firefoxPackageName}`);
  core.setOutput('firefox_package_name', firefoxPackageName);

  const chromePackageName = `10ten_japanese_reader_rikaichamp_-${major}.${minor}.${patch}.zip`;
  core.info(`Chrome package name: ${chromePackageName}`);
  core.setOutput('chrome_package_name', chromePackageName);

  const edgePackageName = `10ten_japanese_reader_rikaichamp_-${major}.${minor}.${patch}.zip`;
  core.info(`Edge package name: ${edgePackageName}`);
  core.setOutput('edge_package_name', edgePackageName);

  const thunderbirdPackageName = `10ten_japanese_reader_rikaichamp_-${major}.${minor}.${patch}${
    pre || ''
  }.zip`;
  core.info(`Thunderbird package name: ${thunderbirdPackageName}`);
  core.setOutput('thunderbird_package_name', thunderbirdPackageName);

  core.info(`Pre-release status: ${!!pre}`);
  core.setOutput('prerelease', !!pre);
} catch (error) {
  core.setFailed(error.message);
}
