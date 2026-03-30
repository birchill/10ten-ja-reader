import * as fs from 'node:fs';
import * as url from 'node:url';

async function main() {
  console.log('Synchronizing version number in XCode project...');
  const nextBuildNumber = process.env.NEXT_XCODE_BUILD_NUMBER;
  if (nextBuildNumber && !/^\d+$/.test(nextBuildNumber)) {
    throw new Error(
      `NEXT_XCODE_BUILD_NUMBER must be numeric, got '${nextBuildNumber}'`
    );
  }

  // Read version
  const packageJsonPath = url.fileURLToPath(
    new URL('../package.json', import.meta.url)
  );
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const versionString = packageJson.version;
  if (!versionString) {
    console.error('Could not find version in package.json');
    process.exit(1);
  }

  // Read in project file
  //
  // Note that if we're updating this path, we'll want to update the 'git add'
  // command in package.json too.
  const projectPath = url.fileURLToPath(
    new URL(
      '../xcode13/10ten Japanese Reader.xcodeproj/project.pbxproj',
      import.meta.url
    )
  );
  const originalContents = fs.readFileSync(projectPath, 'utf8');

  // Update the marketing version
  const marketingStringRe = /(?<=MARKETING_VERSION = )[0-9.]+(?=;)/g;
  const withVersionUpdated = originalContents.replace(
    marketingStringRe,
    versionString
  );
  if (withVersionUpdated === originalContents) {
    console.log('Version is already up-to-date');
    process.exit(0);
  }

  // Update the build ID
  const buildIdRe = /(?<=CURRENT_PROJECT_VERSION = )[0-9]+(?=;)/g;
  const withBuildIdUpdated = withVersionUpdated.replace(
    buildIdRe,
    (match: string) => {
      if (nextBuildNumber) {
        return nextBuildNumber;
      }
      return String(parseInt(match, 10) + 1);
    }
  );

  // Write the result
  fs.writeFileSync(projectPath, withBuildIdUpdated, 'utf8');
  console.log(`  Wrote result to ${projectPath}`);
}

main()
  .then(() => {
    console.log('Done.');
  })
  .catch((e) => {
    console.error('Unhandled error');
    console.error(e);
    process.exit(1);
  });
