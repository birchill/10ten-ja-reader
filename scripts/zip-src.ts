import archiver from 'archiver';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

const DEST_DIR = url.fileURLToPath(new URL('../dist-src', import.meta.url));

async function main() {
  console.log('Creating dest directory...');
  await ensureDir(DEST_DIR);

  const versionString = getPackageVersion();
  const zipFilename = `10ten-ja-reader-${versionString}-src.zip`;
  console.log(`Writing to ${zipFilename}...`);

  const zipPath = path.join(DEST_DIR, zipFilename);
  if (fs.existsSync(zipPath)) {
    console.log('(Replacing existing file)');
    fs.unlinkSync(zipPath);
  }

  const zipFile = fs.createWriteStream(path.join(DEST_DIR, zipFilename));

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('warning', (err: any) => {
    if (err?.code === 'ENOENT') {
      console.warn('File not found');
      console.warn(err);
    } else {
      throw err;
    }
  });

  archive.on('error', function (err: unknown) {
    throw err;
  });

  const finishWritePromise = new Promise((resolve) => {
    zipFile.on('close', resolve);
  });

  archive.pipe(zipFile);

  const rootDir = url.fileURLToPath(new URL('..', import.meta.url));

  const dirs = ['_locales', 'css', 'data', 'docs', 'fonts', 'images'];
  for (const dir of dirs) {
    archive.directory(path.join(rootDir, dir), dir);
  }

  // Add only the critical files from the tests folder
  //
  // These are needed for the build task to work and for the start:firefox and
  // start:chrome tasks to show something useful.
  archive.file(path.join(rootDir, 'tests', 'content-loader.ts'), {
    name: 'tests/content-loader.ts',
  });
  archive.file(path.join(rootDir, 'tests', 'browser-polyfill.ts'), {
    name: 'tests/browser-polyfill.ts',
  });
  archive.glob('tests/playground.*', { cwd: rootDir });
  archive.glob('tests/playground-*.*', { cwd: rootDir });

  // Add `src` while excluding fixtures
  archive.glob('src/**/*', { cwd: rootDir, ignore: '**/*.fixture.tsx' });

  const files = [
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'manifest.json.src',
    'package.json',
    'postcss.config.cjs',
    'README.md',
    'rspack.config.js',
    'tsconfig.json',
    'pnpm-lock.yaml',
  ];
  for (const file of files) {
    archive.file(path.join(rootDir, file), { name: file });
  }

  await archive.finalize();

  await finishWritePromise;

  console.log(`Wrote ${archive.pointer()} bytes`);
}

async function ensureDir(dir: string) {
  return new Promise<void>((resolve, reject) => {
    fs.mkdir(dir, { recursive: true }, (err) =>
      err && err.code !== 'EEXIST' ? reject(err) : resolve()
    );
  });
}

function getPackageVersion() {
  const packageJsonPath = url.fileURLToPath(
    new URL('../package.json', import.meta.url)
  );
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const versionString = packageJson.version;
  if (!versionString) {
    throw new Error('Could not find version in package.json');
  }

  return versionString;
}

main()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
