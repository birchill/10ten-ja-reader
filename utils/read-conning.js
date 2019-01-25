const fs = require('fs');
const path = require('path');
const LineStream = require('byline').LineStream;
const { Writable } = require('stream');

class ConningParser extends Writable {
  constructor(options) {
    super(options);
    this._currentNumber = null;
    this._entries = new Map();
    this._stats = {};
  }

  _write(data, encoding, callback) {
    const line = data.toString('utf8');

    // Split into number and associated kanji
    const lineData = line.split(',');

    // Parse out entries
    if (lineData.length != 2) {
      callback(new Error('Improperly formatted input file'));
      return;
    }

    this._currentNumber = lineData[0];
    for (const entry of lineData[1].split(' ')) {
      this._entries.set(entry, this._currentNumber);
      this._stats[this._currentNumber]++;
    }

    callback(null);
  }

  get entries() { return this._entries; }
  get stats() { return this._stats; }
}

const loadConning = file => {
  const parser = new ConningParser();
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

module.exports = loadConning;
