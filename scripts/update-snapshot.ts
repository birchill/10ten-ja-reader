import { kanaToHiragana } from '@birchill/normal-jp';
import * as fs from 'node:fs';
import * as https from 'node:https';
import {
  Readable,
  Transform,
  TransformCallback,
  TransformOptions,
} from 'node:stream';
import * as url from 'node:url';
import { createBrotliDecompress } from 'node:zlib';

const BASE_URL = 'https://data.10ten.life';

async function main() {
  // Download the latest data
  const currentVersion = await getCurrentVersionInfo(2);
  const data = await readJsonRecords(currentVersion);
  console.log(`Read ${data.size} records.`);

  // Write data to a file, sorted by ID, generating an index from the various
  // headwords to the corresponding character offset at the same time.
  const ids = [...data.keys()].sort();
  const index = new Map<string, Array<number>>();
  let charOffset = 0;

  const dataFilePath = url.fileURLToPath(
    new URL('../data/words.ljson', import.meta.url)
  );
  const dataStream = fs.createWriteStream(dataFilePath);
  for (const id of ids) {
    // Make ID field nullable so we can delete it later.
    const record = data.get(id)! as Partial<JsonRecord>;

    // Add / update index entries
    const keys = [...(record as any).r, ...((record as any).k || [])].map(
      kanaToHiragana
    );
    for (const key of keys) {
      if (index.has(key)) {
        const offsets = index.get(key)!;
        if (!offsets.includes(charOffset)) {
          index.set(key, offsets.concat(charOffset));
        }
      } else {
        index.set(key, [charOffset]);
      }
    }

    // Trim down the record a bit, dropping fields we don't use
    delete record.id;
    for (const sense of (record as any).s) {
      delete sense.xref;
      delete sense.ant;
    }

    const line = JSON.stringify(record) + '\n';
    charOffset += line.length;

    dataStream.write(line);
  }
  await new Promise((resolve) => dataStream.end(resolve));
  console.log(`Wrote ${dataFilePath}.`);

  // Write index, sorted by key
  const indexFilePath = url.fileURLToPath(
    new URL('../data/words.idx', import.meta.url)
  );
  const indexStream = fs.createWriteStream(indexFilePath);
  const sortedKeys = [...index.keys()].sort();
  for (const key of sortedKeys) {
    const lineNumbers = index.get(key)!;
    indexStream.write(`${key},${lineNumbers.join(',')}\n`);
  }
  await new Promise((resolve) => indexStream.end(resolve));
  console.log(`Wrote ${indexFilePath}.`);
}

main()
  .then(() => {
    console.log('Done.');
    process.exit(0);
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
  console.log('Fetching version info from version-en.json...');
  const rawVersionInfo = await getHttpsContents({
    url: `${BASE_URL}/jpdict/reader/version-en.json`,
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

type JsonRecord = { id: number; deleted?: boolean };

async function readJsonRecords(currentVersion: {
  major: number;
  minor: number;
  patch: number;
}): Promise<Map<number, JsonRecord>> {
  const result = new Map<number, JsonRecord>();
  const combinedStream = await getCombinedStream(currentVersion);
  for await (const line of ljsonStreamIterator(combinedStream)) {
    if (isJsonRecord(line)) {
      result.set(line.id, line);
    }
  }

  return result;
}

async function getCombinedStream({
  major,
  minor,
  patch,
}: {
  major: number;
  minor: number;
  patch: number;
}): Promise<Readable> {
  let part = 1;
  return new StreamConcat(async () => {
    const url = `${BASE_URL}/jpdict/reader/words/en/${major}.${minor}.${patch}-${part}.jsonl`;

    let stream: Readable;
    try {
      console.log(`Reading ${url}...`);
      stream = await getHttpsStream(url);
    } catch {
      return null;
    }

    ++part;
    return stream;
  });
}

function isJsonRecord(obj: unknown): obj is JsonRecord {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false;
  }

  // Should have an id.
  if (!('id' in obj)) {
    return false;
  }

  // We should have an ID that is a positive number
  if (
    typeof (obj as JsonRecord).id !== 'number' ||
    (obj as JsonRecord).id <= 0
  ) {
    return false;
  }

  return true;
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

// ---------------------------------------------------------------------------
//
// Stream utilities
//
// ---------------------------------------------------------------------------

class StreamConcat extends Transform {
  private canAddStream = true;
  private currentStream: Readable | null | Promise<Readable | null> = null;
  private streamIndex = 0;

  constructor(
    private streams:
      | Array<Readable>
      | (() => Readable | null | Promise<Readable | null>),
    private options: TransformOptions & { advanceOnClose?: boolean } = {}
  ) {
    super(options);
    void this.nextStream();
  }

  addStream(newStream: Readable): void {
    if (!this.canAddStream) {
      return void this.emit('error', new Error("Can't add stream."));
    }
    (this.streams as Array<Readable>).push(newStream);
  }

  async nextStream() {
    this.currentStream = null;
    if (Array.isArray(this.streams) && this.streamIndex < this.streams.length) {
      this.currentStream = this.streams[this.streamIndex++];
    } else if (typeof this.streams === 'function') {
      this.canAddStream = false;
      this.currentStream = this.streams();
    }

    const pipeStream = async () => {
      if (!this.currentStream) {
        this.canAddStream = false;
        this.end();
      } else if (isAsyncCallback(this.currentStream)) {
        this.currentStream = await this.currentStream;
        await pipeStream();
      } else {
        this.currentStream.pipe(this, { end: false });
        let streamClosed = false;
        const goNext = async () => {
          if (streamClosed) {
            return;
          }
          streamClosed = true;
          await this.nextStream();
        };

        this.currentStream.on('end', goNext);
        if (this.options.advanceOnClose) {
          this.currentStream.on('close', goNext);
        }
      }
    };
    await pipeStream();
  }

  _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ) {
    callback(null, chunk);
  }
}

function isAsyncCallback(
  arg: Promise<Readable | null> | Readable
): arg is Promise<Readable | null> {
  return typeof (arg as Promise<any>).then === 'function';
}

async function* ljsonStreamIterator(
  stream: Readable
): AsyncIterableIterator<Record<string, any>> {
  const lineEnd = /\n|\r|\r\n/m;
  const decoder = new TextDecoder('utf-8');

  const records: Array<Record<string, any>> = [];
  let error: unknown | undefined;
  let done = false;

  let buffer = '';

  const processBuffer = ({ done }: { done: boolean }) => {
    const lines = buffer.split(lineEnd);

    // If we're not done, move the last line back into the buffer since it might
    // not be a complete line.
    if (!done) {
      buffer = lines.length ? lines.splice(lines.length - 1, 1)[0] : '';
    }

    for (const line of lines) {
      if (!line) {
        continue;
      }

      try {
        records.push(JSON.parse(line));
      } catch (e) {
        error = e;
      }
    }
  };

  stream
    .on('data', (chunk) => {
      buffer += decoder.decode(chunk, { stream: true });
      processBuffer({ done: false });
    })
    .on('error', (err) => {
      error = err;
    })
    .on('end', () => {
      processBuffer({ done: true });
      done = true;
    });

  while (true) {
    if (error) {
      throw error;
    }

    while (records.length) {
      yield records.shift()!;
    }

    if (done) {
      return;
    }

    // Wait a tick for more data
    // (It's important to use setImmediate here rather than process.nextTick or
    // Promise.resolve since setImmediate runs after I/O callbacks).
    await new Promise<void>((res) => setImmediate(res));
  }
}
