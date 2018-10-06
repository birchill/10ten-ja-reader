const fs = require('fs');
const path = require('path');
const LineStream = require('byline').LineStream;
const { Writable } = require('stream');

class KanKenParser extends Writable {
  constructor(options) {
    super(options);
    this._currentLevel = null;
    this._entries = new Map();
    this._stats = {};
  }

  _write(data, encoding, callback) {
    const line = data.toString('utf8');

    // Look for a level heading
    const levelMatches = line.match(/^(準?)(\d{1,2})級$/);
    if (levelMatches) {
      this._currentLevel = levelMatches[2] + (levelMatches[1] ? '.5' : '');
      this._stats[this._currentLevel] = 0;
      callback(null);
      return;
    }

    // Parse out entries
    if (this._currentLevel === '') {
      callback(new Error('Got entry without any preceding level indication'));
      return;
    }

    for (const entry of line.split(' ')) {
      this._entries.set(entry, this._currentLevel);
      this._stats[this._currentLevel]++;
    }

    callback(null);
  }

  get entries() { return this._entries; }
  get stats() { return this._stats; }
}

const loadKanKen = file => {
  const parser = new KanKenParser();
  return new Promise((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(new LineStream())
      .pipe(parser)
      .on('finish', () => {
        resolve(parser.entries);
      })
      .on('error', err => {
        reject(`Read error: ${err}`);
      });
  });
};

loadKanKen(path.join(__dirname, '..', 'data', '漢検.txt')).then(map => {
  console.log(map.size);
});
