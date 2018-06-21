const fs = require('fs');
const http = require('http');
const zlib = require('zlib');
const path = require('path');
const iconv = require('iconv-lite');
const LineStream = require('byline').LineStream;
const { Transform } = require('stream');

// prettier-ignore
const HANKAKU_KATAKANA_TO_HIRAGANA = [
  0x3092, 0x3041, 0x3043, 0x3045, 0x3047, 0x3049, 0x3083, 0x3085, 0x3087,
  0x3063, 0x30fc, 0x3042, 0x3044, 0x3046, 0x3048, 0x304a, 0x304b, 0x304d,
  0x304f, 0x3051, 0x3053, 0x3055, 0x3057, 0x3059, 0x305b, 0x305d, 0x305f,
  0x3061, 0x3064, 0x3066, 0x3068, 0x306a, 0x306b, 0x306c, 0x306d, 0x306e,
  0x306f, 0x3072, 0x3075, 0x3078, 0x307b, 0x307e, 0x307f, 0x3080, 0x3081,
  0x3082, 0x3084, 0x3086, 0x3088, 0x3089, 0x308a, 0x308b, 0x308c, 0x308d,
  0x308f, 0x3093,
];
// prettier-ignore
const VOICED_KATAKANA_TO_HIRAGANA = [
  0x30f4, 0xff74, 0xff75, 0x304c, 0x304e, 0x3050, 0x3052, 0x3054, 0x3056,
  0x3058, 0x305a, 0x305c, 0x305e, 0x3060, 0x3062, 0x3065, 0x3067, 0x3069,
  0xff85, 0xff86, 0xff87, 0xff88, 0xff89, 0x3070, 0x3073, 0x3076, 0x3079,
  0x307c,
];
// prettier-ignore
const SEMIVOICED_KATAKANA_TO_HIRAGANA = [
  0x3071, 0x3074, 0x3077, 0x307a, 0x307d
];

const normalizeEntry = entry => {
  let previous = 0;
  let result = '';

  for (let i = 0; i < entry.length; ++i) {
    let originalChar = entry.charCodeAt(i);
    let c = originalChar;

    // full-width katakana to hiragana
    if (c >= 0x30a1 && c <= 0x30f3) {
      c -= 0x60;
    } else if (c >= 0xff66 && c <= 0xff9d) {
      // half-width katakana to hiragana
      c = HANKAKU_KATAKANA_TO_HIRAGANA[c - 0xff66];
    } else if (c == 0xff9e) {
      // voiced (used in half-width katakana) to hiragana
      if (previous >= 0xff73 && previous <= 0xff8e) {
        result = result.slice(0, -1);
        c = VOICED_KATAKANA_TO_HIRAGANA[previous - 0xff73];
      }
    } else if (c == 0xff9f) {
      // semi-voiced (used in half-width katakana) to hiragana
      if (previous >= 0xff8a && previous <= 0xff8e) {
        result = result.slice(0, -1);
        c = SEMIVOICED_KATAKANA_TO_HIRAGANA[previous - 0xff8a];
      }
    } else if (c == 0xff5e) {
      // ignore ～
      previous = 0;
      continue;
    }

    result += String.fromCharCode(c);
    previous = originalChar;
  }

  return result;
};

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
      const header = line.match(/\/Created: (.*?)\//);
      if (header) {
        console.log(`Parsing dictionary created: ${header[1]}`);
      } else {
        console.log('Parsing dictionary data (failed to parse header)');
      }
      this._firstLine = false;
      callback(null, null);
      return;
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

    const mainEntry = normalizeEntry(matches[1]);
    addOrUpdateEntry(mainEntry);

    if (matches.length > 2 && matches[2] && matches[2] !== mainEntry) {
      addOrUpdateEntry(matches[2]);
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
            fs.createWriteStream(
              path.join(__dirname, '..', 'extension', 'data', dataFile)
            )
          )
          .on('error', err => {
            reject(err);
          })
          .on('close', () => {
            console.log('Writing index...');
            const indexStream = fs.createWriteStream(
              path.join(__dirname, '..', 'extension', 'data', indexFile)
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
