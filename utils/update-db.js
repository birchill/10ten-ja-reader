const fs = require('fs');
const http = require('http');
const zlib = require('zlib');
const path = require('path');
const iconv = require('iconv-lite');
const LineStream = require('byline').LineStream;
const CombinedStream = require('combined-stream2');
const { Transform, Writable } = require('stream');
const kanaToHiragana = require('@birchill/kana-to-hiragana');

const SUPPORTED_REF_TYPES = new Set([
  'B', // Nelson radical or traditional radical if same
  'C', // Traditional radical when they differ
  'H',
  'L',
  'E',
  'D', // We'll manually filter this down to DK later
  'N',
  'V',
  'Y',
  'P',
  'I', // I and IN
  // Not really supported, just here to make the diff smaller
  'S',
  'G',
  'F',
]);

class DictParser extends Transform {
  constructor(options) {
    super(options);
    this._firstLine = true;
    this._length = 0;
    this._index = {};
  }

  _transform(data, encoding, callback) {
    const line = data.toString('utf8');

    // Skip the header
    if (this._firstLine) {
      this._firstLine = false;
      const header = line.match(/\/Created: (.*?)\//);
      if (header) {
        console.log(`Parsing dictionary created: ${header[1]}`);
        callback(null, null);
        return;
      }
      console.log(
        'Failed to parse header. Maybe the header is in the wrong place?'
      );
      console.log(`Got ${line}`);
    }

    // Try to parse first part of entry
    const matches = line.match(/^(.+?)\s+(?:\[(.*?)\])?/);
    if (matches === null) {
      console.log(`Failed to parse line: ${line}`);
      callback(null, null);
      return;
    } else if (matches[0] === '　？？？ ') {
      console.log(`Skipping misplaced header line: ${line}`);
      callback(null, null);
      return;
    }

    const addOrUpdateEntry = entry => {
      if (this._index.hasOwnProperty(entry)) {
        this._index[entry].push(this._length);
      } else {
        this._index[entry] = [this._length];
      }
    };

    const [mainEntry] = kanaToHiragana(matches[1]);
    addOrUpdateEntry(mainEntry);

    if (matches.length > 2 && matches[2]) {
      const [subEntry] = kanaToHiragana(matches[2]);
      if (subEntry !== mainEntry) {
        addOrUpdateEntry(subEntry);
      }
    }

    this._length += line.length + 1;
    callback(null, data + '\n');
  }

  printIndex(stream) {
    for (const entry of Object.keys(this._index).sort()) {
      stream.write(`${entry},${this._index[entry].join()}\n`);
    }
  }
}

const parseEdict = (url, dataFile, indexFile) => {
  const parser = new DictParser();
  return new Promise((resolve, reject) => {
    http
      .get(url, res => {
        res
          .pipe(zlib.createGunzip())
          .pipe(iconv.decodeStream('euc-jp'))
          .pipe(iconv.encodeStream('utf-8'))
          .pipe(new LineStream())
          .pipe(parser)
          .pipe(
            fs.createWriteStream(path.join(__dirname, '..', 'data', dataFile))
          )
          .on('error', err => {
            reject(err);
          })
          .on('close', () => {
            console.log('Writing index...');
            const indexStream = fs.createWriteStream(
              path.join(__dirname, '..', 'data', indexFile)
            );
            parser.printIndex(indexStream);
            indexStream.end();
            resolve();
          });
      })
      .on('error', err => {
        reject(`Connection error: ${err}`);
      });
  });
};

console.log('Fetching word dictionary...');

parseEdict('http://ftp.monash.edu/pub/nihongo/edict.gz', 'dict.dat', 'dict.idx')
  .then(() => {
    console.log('Fetching names dictionary...');
    return parseEdict(
      'http://ftp.monash.edu/pub/nihongo/enamdict.gz',
      'names.dat',
      'names.idx'
    );
  })
  .then(() => {
    console.log('Done.');
  })
  .catch(err => {
    console.log(`Error: '${err}'`);
  });
