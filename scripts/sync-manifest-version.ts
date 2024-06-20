import * as fs from 'node:fs';
import * as url from 'node:url';
import { parseSemVer } from 'semver-parser';

function main() {
  console.log('Synchronizing version number in manifest...');

  // Read version
  const packageJson = JSON.parse(
    fs.readFileSync(
      url.fileURLToPath(new URL('../package.json', import.meta.url)),
      'utf8'
    )
  );
  const originalVersionString = packageJson.version;
  if (!originalVersionString) {
    console.error('Could not find version in package.json');
    process.exit(1);
  }
  console.log(`  Version in package.json: ${packageJson.version}`);

  // Parse it
  const { major, minor, patch, pre, matches } = parseSemVer(
    originalVersionString
  );
  if (!matches) {
    console.error(`Could not parse version ${originalVersionString}`);
    process.exit(1);
  }

  // Generate updated version info
  const versionInfo = pre
    ? `/*#if supports_alpha_version*/
  "version": "${major}.${minor}.${patch}${pre}",
  /*#else*/
  "version": "${major}.${minor}.${patch}",
  "version_name": "${originalVersionString}",
  /*#endif*/`
    : `"version": "${major}.${minor}.${patch}",`;

  // Update the manifest
  const manifestPath = url.fileURLToPath(
    new URL('../manifest.json.src', import.meta.url)
  );
  const manifestSrc = fs.readFileSync(manifestPath, 'utf8');
  const existingVersionInfo =
    /(\/\*#if supports_alpha_version\*\/.*?\/\*#endif\*\/)|("version": "\d+\.\d+\.\d+",)/s;
  if (!manifestSrc.match(existingVersionInfo)) {
    console.error('Failed to find existing version information in manifest');
    process.exit(1);
  }
  const updatedManifestSrc = manifestSrc.replace(
    existingVersionInfo,
    versionInfo
  );

  // Write the result
  fs.writeFileSync(manifestPath, updatedManifestSrc, 'utf8');
  console.log(`  Wrote result to ${manifestPath}`);
}

main();
