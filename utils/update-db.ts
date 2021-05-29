/*
 * SPDX-FileCopyrightText: 2020 Brian Birtles <https://github.com/birtles>
 * SPDX-FileCopyrightText: 2020 Erek Speed <https://erekspeed.com>
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { LineStream } from 'byline';
import {
  Transform,
  TransformCallback,
  Writable,
  WritableOptions,
} from 'stream';
import fs, { WriteStream, promises as promiseFs } from 'fs';
import http from 'http';
import iconv from 'iconv-lite';
import parse from 'csv-parse/lib/sync';
import path from 'path';
import zlib from 'zlib';

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

// List of reference types that we copy to the kanji DB file.
// See http://www.edrdg.org/wiki/index.php/KANJIDIC_Project#Content_.26_Format
const SUPPORTED_REF_TYPES = [
  'B',
  'H',
  'L',
  'E',
  'DK',
  'DN',
  'N',
  'V',
  'Y',
  'P',
  'I',
  'IN',
  // Not really supported, just here to make the diff smaller
  'S',
  'G',
  'F',
];

const normalizeEntry = (entry: string) => {
  let previous = 0;
  let result = '';

  for (let i = 0; i < entry.length; ++i) {
    const originalChar = entry.charCodeAt(i);
    let c = originalChar;

    // full-width katakana to hiragana
    if (c >= 0x30a1 && c <= 0x30f3) {
      c -= 0x60;
    } else if (c >= 0xff66 && c <= 0xff9d) {
      // half-width katakana to hiragana
      c = HANKAKU_KATAKANA_TO_HIRAGANA[c - 0xff66];
    } else if (c === 0xff9e) {
      // voiced (used in half-width katakana) to hiragana
      if (previous >= 0xff73 && previous <= 0xff8e) {
        result = result.slice(0, -1);
        c = VOICED_KATAKANA_TO_HIRAGANA[previous - 0xff73];
      }
    } else if (c === 0xff9f) {
      // semi-voiced (used in half-width katakana) to hiragana
      if (previous >= 0xff8a && previous <= 0xff8e) {
        result = result.slice(0, -1);
        c = SEMIVOICED_KATAKANA_TO_HIRAGANA[previous - 0xff8a];
      }
    } else if (c === 0xff5e) {
      // ignore ～
      previous = 0;
      continue;
    }

    result += String.fromCharCode(c);
    previous = originalChar;
  }

  return result;
};

/** Parses word and name dictionaries. */
class DictParser extends Transform {
  #firstLine = true;
  #length = 0;
  #index: Record<string, Array<number>> = {};
  /** Pass options as per Transform. */
  constructor(options?: {}) {
    super(options);
  }

  /**
   * Transforms data
   *
   * @override
   */
  _transform(data: Buffer, encoding: string, callback: TransformCallback) {
    const line = data.toString('utf8');

    // Skip the header
    if (this.#firstLine) {
      this.#firstLine = false;
      const header = line.match(/\/Created: (.*?)\//);
      if (header) {
        console.log(`Parsing dictionary created: ${header[1]}`);
        callback(null, null);
        return;
      }
      console.log(
        'Failed to parse header. Maybe the header is in the wrong place?'
      );
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

    const addOrUpdateEntry = (entry: string) => {
      if (this.#index.hasOwnProperty(entry)) {
        this.#index[entry].push(this.#length);
      } else {
        this.#index[entry] = [this.#length];
      }
    };

    const mainEntry = normalizeEntry(matches[1]);
    addOrUpdateEntry(mainEntry);

    if (matches.length > 2 && matches[2]) {
      const subEntry = normalizeEntry(matches[2]);
      if (subEntry !== mainEntry) {
        addOrUpdateEntry(subEntry);
      }
    }

    this.#length += line.length + 1;
    callback(null, data + '\n');
  }

  /** Prints the index for given stream. */
  printIndex(stream: WriteStream) {
    for (const entry of Object.keys(this.#index).sort()) {
      stream.write(`${entry},${this.#index[entry].join()}\n`);
    }
  }
}

const parseEdict = (url: string, dataFile: string, indexFile: string) => {
  const parser = new DictParser();
  return new Promise<void>((resolve, reject) => {
    http
      .get(url, (res) => {
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
          .on('error', (err) => {
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
      .on('error', (err) => {
        reject(new Error(`Connection error: ${err}`));
      });
  });
};

/** Handles parsing of KanjiDict format. */
class KanjiDictParser extends Writable {
  readonly #heisigData: Map<string, HeisigDatum>;
  #index: Record<string, string> = {};
  /** Construct as per Writable. */
  constructor(
    options: { heisigData: Map<string, HeisigDatum> } & WritableOptions
  ) {
    super(options);
    this.#heisigData = options.heisigData;
  }

  /**
   * Write the data.
   *
   * @override
   */
  _write(
    chunk: Buffer,
    encoding: string,
    callback: (error?: Error | null) => void
  ) {
    const line = chunk.toString('utf8');

    // Skip the header
    if (line.startsWith('# ')) {
      const header = line.match(/^# (\S*).*?\/(\d{4}-\d{2}-\d{2})\/$/);
      if (header) {
        console.log(`Parsing ${header[1]} dictionary from ${header[2]}`);
        callback();
        return;
      }
      console.log(`Failed to parse header: ${line}`);
    }

    // Data file format
    //
    // See http://www.edrdg.org/wiki/index.php/KANJIDIC_Project#Content_.26_Format
    //
    // <kanji> <reference codes> <readings> [T1 <name readings>] [T2 <bushumei>] <meanings>
    //
    // <kanji> - Single char (but could be non-BMP so need to be careful what JS
    //           methods we use to test for a char)
    // <reference codes> - Space separated, typically one uppercase ASCII
    //                     letter following by a sequence of ASCII letters and
    //                     numbers, ending in a number.
    //                     Should have at least a B<digit>+ field representing
    //                     the radical. Rikaichamp assumes that will be there so
    //                     we should assert if an entry is missing one.
    // <readings> - Space separated, just the characters themselves.
    // <meanings> - Space separated, each meaning is wrapped in {}.
    //              We should assert if there is a | in any of these as it will
    //              confuse the output.
    //              (Also a comma could confuse it too. Would mean we should
    //              switch to ; as a separator in that case.)
    //
    // e.g. 士|3B4E U58eb B33 G4 S3 F526 J1 N1160 V1117 H3405 DP4213 DK2129 DL2877 L319 DN341 K301 O41 DO59 MN5638 MP3.0279 E494 IN572 DA581 DS410 DF1173 DH521 DT441 DC386 DJ755 DG393 DM325 P4-3-2 I3p0.1 Q4010.0 DR1472 Yshi4 Wsa シ さむらい T1 お ま T2 さむらい {gentleman} {scholar} {samurai} {samurai radical (no. 33)}
    //
    // So basically, the only way to know if we've gone from <reference codes>
    // to <readings> is to check the actual codepoints being used. Ugh.
    //
    // Note that we also have some odd entries like:
    //
    //   𡑮 .=.=== U2146E B32 S16
    //   𡗗 X253E U215D7 B37 S5 Ypeng3
    //   𢦏 .=.=== U2298F B62 S6 Yzai1 {to cut} {wound} {hurt}
    //   𢈘 .=.=== U22218 B53 S9 N1510 DP3845 ロク しか か
    //
    // (Yes, including the trailing spaces too.)
    //
    // Output pieces:
    //  - Kanji
    //  - Reference codes
    //  - Readings
    //  - Name readings
    //  - Bushumei
    //  - Meanings, command separated
    // (All | delimited)
    const matches = line.match(
      /^(\S+) (?:.=.=== )?((?:[\x21-\x7a]+ )+)((?:[\x80-\uffff.-]+ )+)?(?:T1 ((?:[\x80-\uffff.-]+ )+))?(?:T2 ((?:[\x80-\uffff.-]+ )+))?((?:\{[^}]+\} ?)*)?$/
    );
    if (matches === null) {
      console.log(`Failed to parse line: ${line}`);
      callback(null);
      return;
    }

    // Trim references
    const refs = matches[2].trim().split(' ');
    const refsToKeep = [];
    let hasB = false;
    for (const ref of refs) {
      let finalRef = ref;
      if (
        ref.length &&
        SUPPORTED_REF_TYPES.some((supportedRef) => ref.startsWith(supportedRef))
      ) {
        if (ref[0] === 'B') {
          hasB = true;
        }

        // Augment Heisig 5th and 6th edition indices with keyword information.
        if (ref.startsWith('L')) {
          const keyword5th = this.#heisigData.get(matches[1])?.keyword_5th_ed;
          if (keyword5th !== undefined) {
            finalRef += `:${keyword5th.replace(/ /g, ':')}`;
          }
        }
        if (ref.startsWith('DN')) {
          const keyword6th = this.#heisigData.get(matches[1])?.keyword_6th_ed;
          if (keyword6th !== undefined) {
            finalRef += `:${keyword6th.replace(/ /g, ':')}`;
          }
        }

        refsToKeep.push(finalRef);
      }
    }
    if (!hasB) {
      throw new Error(`No radical reference found for ${line}`);
    }
    matches[2] = refsToKeep.join(' ');

    // Prepare meanings
    if (matches[6]) {
      const meanings = matches[6].trim().split('} {');
      if (meanings.length) {
        meanings[0] = meanings[0].slice(1);
        const end = meanings.length - 1;
        meanings[end] = meanings[end].slice(0, -1);
      }
      // Check for embedded |. That's the separator we use in the output so if
      // it also occurs in the meaning things are not going to end well.
      const hasEmbeddedPipe = meanings.some((meaning) => meaning.includes('|'));
      if (hasEmbeddedPipe) {
        throw new Error(`Got meaning with embedded "|": ${line}`);
      }
      // Join with ; if some of the entries have commas
      const hasEmbeddedCommas = meanings.some((meaning) =>
        meaning.includes(',')
      );
      matches[6] = meanings.join(hasEmbeddedCommas ? '; ' : ', ');
    }

    this.#index[matches[1]] = matches
      .slice(2)
      .map((part) => (part ? part.trim() : ''))
      .join('|');

    callback();
  }

  /** Print the dictionary files */
  printDict(stream: fs.WriteStream) {
    for (const entry of Object.keys(this.#index).sort()) {
      stream.write(`${entry}|${this.#index[entry]}\n`);
    }
  }
}

interface HeisigDatum {
  kanji: string;
  id_5th_ed: string;
  id_6th_ed: string;
  keyword_5th_ed: string;
  keyword_6th_ed: string;
  components: string;
  on_reading: string;
  kun_reading: string;
}

const loadHeisigData = async (): Promise<Map<string, HeisigDatum>> => {
  const data = await promiseFs.readFile(
    path.join(__dirname, 'heisig-kanjis.csv')
  );
  const records: Map<string, HeisigDatum> = new Map();
  (parse(data, { columns: true, comment: '#' }) as HeisigDatum[]).forEach(
    (record) => {
      records.set(record.kanji, record);
    }
  );
  return records;
};

const parseKanjiDic = async (
  sources: { url: string; encoding: string }[],
  dataFile: string
) => {
  const heisigData = await loadHeisigData();
  const parser = new KanjiDictParser({ heisigData: heisigData });

  const readFile = (url: string, encoding: string) =>
    new Promise((resolve) => {
      http
        .get(url, (res) => {
          res
            .pipe(zlib.createGunzip())
            .pipe(iconv.decodeStream(encoding))
            .pipe(iconv.encodeStream('utf-8'))
            .pipe(new LineStream())
            .on('end', resolve)
            .pipe(parser, { end: false });
        })
        .on('error', (err) => {
          throw Error(`Connection error: ${err}`);
        });
    });

  for (const source of sources) {
    await readFile(source.url, source.encoding);
  }

  parser.end();

  const output = fs.createWriteStream(
    path.join(__dirname, '..', 'extension', 'data', dataFile)
  );
  parser.printDict(output);
};

console.log('Fetching word dictionary...');

parseEdict('http://ftp.edrdg.org/pub/Nihongo/edict.gz', 'dict.dat', 'dict.idx')
  .then(() => {
    console.log('Fetching names dictionary...');
    return parseEdict(
      'http://ftp.edrdg.org/pub/Nihongo/enamdict.gz',
      'names.dat',
      'names.idx'
    );
  })
  .then(() => {
    console.log('Fetching kanji dictionaries...');
    return parseKanjiDic(
      [
        {
          url: 'http://www.edrdg.org/kanjidic/kanjidic.gz',
          encoding: 'euc-jp',
        },
        {
          url: 'http://www.edrdg.org/kanjidic/kanjd212.gz',
          encoding: 'euc-jp',
        },
      ],
      'kanji.dat'
    );
  })
  .then(() => {
    console.log('Done.');
    return undefined;
  })
  .catch((err) => {
    console.log(`Error: '${err}'`);
  });
