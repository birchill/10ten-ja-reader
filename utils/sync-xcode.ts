import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Synchronizing version number in XCode project...');

  // Read version
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  );
  const versionString = packageJson.version;
  if (!versionString) {
    console.error('Could not find version in package.json');
    process.exit(1);
  }

  // Read in project file
  //
  // Note that if we're updating this path, we'll want to update the 'git add'
  // command in package.json too.
  const projectPath = path.join(
    __dirname,
    '..',
    'xcode13',
    '10ten Japanese Reader.xcodeproj',
    'project.pbxproj'
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

  // Bump the build ID
  const buildIdRe = /(?<=CURRENT_PROJECT_VERSION = )[0-9]+(?=;)/g;
  const withBuildIdUpdated = withVersionUpdated.replace(
    buildIdRe,
    (match: string) => String(parseInt(match, 10) + 1)
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
