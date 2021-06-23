const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const DEST_DIR = path.join(__dirname, '..', 'dist-src');

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

  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('File not found');
      console.warn(err);
    } else {
      throw err;
    }
  });

  archive.on('error', function (err) {
    throw err;
  });

  const finishWritePromise = new Promise((resolve) => {
    archive.on('close', resolve);
  });

  archive.pipe(zipFile);

  const rootDir = path.join(__dirname, '..');

  const dirs = [
    '_locales',
    'css',
    'data',
    'html',
    'images',
    'lib',
    'src',
    'tests',
  ];
  for (const dir of dirs) {
    archive.directory(path.join(rootDir, dir), dir);
  }

  const files = [
    'CONTRIBUTING.md',
    'manifest.json.src',
    'package.json',
    'README.md',
    'tsconfig.json',
    'webpack.config.js',
    'yarn.lock',
  ];
  for (const file of files) {
    archive.file(path.join(rootDir, file), { name: file });
  }

  archive.finalize();

  await finishWritePromise;

  console.log(`Wrote ${archive.pointer()} bytes`);
}

async function ensureDir(dir) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dir, { recursive: true }, (err) =>
      err && err.code !== 'EEXIST' ? reject(err) : resolve()
    );
  });
}

function getPackageVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  );
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
