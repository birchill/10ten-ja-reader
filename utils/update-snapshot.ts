import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import split from 'split2';
import { Readable } from 'stream';
import { createBrotliDecompress } from 'zlib';

const BASE_URL = 'https://d907hooix2fo8.cloudfront.net';

async function main() {
  // Download the latest data
  const currentVersion = await getCurrentVersionInfo(1);
  const data = await readJsonRecords(currentVersion);
  console.log(`Read ${data.size} records.`);

  // Write data to a file
  const dataFilePath = path.join(__dirname, '..', 'data', 'words.ljson');
  const dataStream = fs.createWriteStream(dataFilePath);
  for (const record of data.values()) {
    // Trim down the record a bit, dropping fields we don't use
    delete record.id;
    for (const sense of (record as any).s) {
      delete sense.xref;
      delete sense.ant;
    }

    dataStream.write(JSON.stringify(record) + '\n');
  }
  console.log(`Wrote ${dataFilePath}.`);

  // XXX Generate an index for each of the kanji / reading keys
  // XXX Write out the index file
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

// ---------------------------------------------------------------------------
//
// Version info
//
// ---------------------------------------------------------------------------

interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  updateTs: number;
  databaseVersion?: string;
  dateOfCreation: string;
}

async function getCurrentVersionInfo(
  majorVersion: number
): Promise<VersionInfo> {
  console.log(`Fetching version info from jpdict-rc-en-version.json...`);
  const rawVersionInfo = await getHttpsContents({
    url: `${BASE_URL}/jpdict-rc-en-version.json`,
  });
  if (!rawVersionInfo) {
    throw new Error('Version file was empty');
  }

  const versionInfo: {
    [dbtype: string]: { [majorVersion: number]: VersionInfo };
  } = JSON.parse(rawVersionInfo);

  if (typeof versionInfo !== 'object' || versionInfo === null) {
    throw new Error(`Invalid version information: ${rawVersionInfo}`);
  }

  if (typeof versionInfo.words !== 'object' || versionInfo.words === null) {
    throw new Error('No data found for words database');
  }

  if (
    typeof versionInfo.words[majorVersion] !== 'object' ||
    versionInfo.words[majorVersion] === null
  ) {
    throw new Error(
      `No data found for version ${majorVersion} of words database`
    );
  }

  if (
    typeof versionInfo.words[majorVersion].major !== 'number' ||
    typeof versionInfo.words[majorVersion].minor !== 'number' ||
    typeof versionInfo.words[majorVersion].patch !== 'number'
  ) {
    throw new Error(`Invalid version information: ${rawVersionInfo}`);
  }

  return versionInfo.words[majorVersion];
}

// ---------------------------------------------------------------------------
//
// Data file reading
//
// ---------------------------------------------------------------------------

type JsonRecord = {
  id: string;
  deleted?: boolean;
};

async function readJsonRecords(currentVersion: {
  major: number;
  minor: number;
  patch: number;
}): Promise<Map<string, JsonRecord>> {
  const { major, minor, patch } = currentVersion;

  // Get base version
  const baseKey = `words-rc-en-${major}.${minor}.0.ljson`;
  console.log(`Fetching latest version from: ${baseKey}...`);

  const result = new Map<string, JsonRecord>();
  await applyPatch(await getHttpsStream(`${BASE_URL}/${baseKey}`), result);

  // Apply subsequent patches
  let currentPatch = 0;
  while (++currentPatch <= patch) {
    const patchKey = `words-rc-en-${major}.${minor}.${currentPatch}.ljson`;
    console.log(`Fetching patch: ${patchKey}...`);

    await applyPatch(await getHttpsStream(`${BASE_URL}/${patchKey}`), result);
  }

  return result;
}

function isJsonRecord(obj: unknown): obj is JsonRecord {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  // Should have an id.
  if (!('id' in obj)) {
    return false;
  }

  // If we have an id, it must be a non-zero number
  if (typeof (obj as JsonRecord).id !== 'number' || !(obj as JsonRecord).id) {
    return false;
  }

  if ('deleted' in obj && typeof (obj as JsonRecord).deleted !== 'boolean') {
    return false;
  }

  return true;
}

function applyPatch(
  stream: Readable,
  result: Map<string, Object>
): Promise<void> {
  return new Promise((resolve, reject) => {
    stream
      .pipe(split(JSON.parse))
      .on('data', (obj: unknown) => {
        if (!isJsonRecord(obj)) {
          return;
        }

        if (obj.deleted) {
          result.delete(obj.id);
        } else {
          result.set(obj.id, obj);
        }
      })
      .on('error', (err) => reject(err))
      .on('end', resolve);
  });
}

// ---------------------------------------------------------------------------
//
// Network functions
//
// ---------------------------------------------------------------------------

async function getHttpsContents({
  url,
  nullOnMissing,
}: {
  url: string;
  nullOnMissing?: boolean;
}): Promise<string | null> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          if (res.statusCode === 400 && nullOnMissing) {
            resolve(null);
          } else {
            reject(new Error(`Got status ${res.statusCode} for ${url}`));
          }
        } else {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve(body);
          });
        }
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

function getHttpsStream(url: string): Promise<Readable> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Got status ${res.statusCode} for ${url}`));
        } else {
          let stream: Readable = res;

          const contentEncoding = res.headers['content-encoding'];
          if (contentEncoding === 'br') {
            const brotli = createBrotliDecompress();
            res.pipe(brotli);
            stream = brotli;
          }

          resolve(stream);
        }
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}
