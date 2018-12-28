import Config from './config';

type StorageName = 'sync' | 'local';
type StorageChange = {
  oldValue?: any;
  newValue?: any;
};
type ChangeDict = { [field: string]: StorageChange };
type Listener = (changes: ChangeDict, areaName: StorageName) => void;

class MockStorage {
  onChanged = new MockOnChanged();
  sync = new MockStorageArea(this.onChanged, 'sync');
}

class MockOnChanged {
  _listeners: Array<Listener> = [];

  addListener(listener: Listener) {
    if (this._listeners.indexOf(listener) !== -1) {
      return;
    }
    this._listeners.push(listener);
  }

  removeListener(listener: Listener) {
    const index = this._listeners.indexOf(listener);
    if (index === -1) {
      return;
    }
    this._listeners.splice(index, 1);
  }

  _onChange(changes: ChangeDict, areaName: StorageName) {
    for (const listener of this._listeners) {
      listener(changes, areaName);
    }
  }
}

type StorageDict = { [key: string]: any };

class MockStorageArea {
  _storage: StorageDict = {};
  _onChanged: MockOnChanged;
  _areaName: StorageName;

  constructor(onChanged: MockOnChanged, areaName: StorageName) {
    this._onChanged = onChanged;
    this._areaName = areaName;
  }

  get(
    param: string | Array<string> | { [key: string]: any } | null
  ): Promise<any> {
    if (param === undefined || param === null) {
      return Promise.resolve(this._storage);
    }

    if (Array.isArray(param)) {
      const result: StorageDict = {};
      for (const field of param) {
        result[field] = this._storage[field];
      }
      return Promise.resolve(result);
    }

    if (typeof param === 'object') {
      const result: StorageDict = {};
      for (const field of Object.keys(param)) {
        result[field] = this._storage[field] || param[field];
      }
      return Promise.resolve(result);
    }

    return Promise.reject('Unexpected param type');
  }

  set(obj: StorageDict) {
    const changes: ChangeDict = {};
    for (const field of Object.keys(obj)) {
      changes[field] = {};
      if (typeof this._storage[field] !== 'undefined') {
        changes[field].oldValue = this._storage[field];
      }
      if (typeof obj[field] !== 'undefined') {
        changes[field].newValue = obj[field];
      }
    }

    this._storage = { ...this._storage, ...obj };

    setImmediate(() => {
      this._onChanged._onChange(changes, this._areaName);
    });

    return Promise.resolve();
  }
}

global.REF_ABBREVIATIONS = [
  { abbrev: 'H', name: 'Halpern' },
  { abbrev: 'L', name: 'Heisig' },
  { abbrev: 'E', name: 'Henshall' },
  { abbrev: 'KK', name: 'Kanji Kentei' },
  { abbrev: 'DK', name: 'Kanji Learners Dictionary' },
  { abbrev: 'N', name: 'Nelson' },
  { abbrev: 'V', name: 'New Nelson' },
  { abbrev: 'Y', name: 'PinYin' },
  { abbrev: 'P', name: 'Skip Pattern' },
  { abbrev: 'IN', name: 'Tuttle Kanji & Kana' },
  { abbrev: 'I', name: 'Tuttle Kanji Dictionary' },
  { abbrev: 'U', name: 'Unicode' },
];

describe('Config', () => {
  beforeEach(() => {
    global.browser = { storage: new MockStorage() };
  });

  it('returns the default settings', () => {
    const config = new Config();

    expect(config.readingOnly).toEqual(false);
    expect(config.toggleKey).toEqual('Alt+R');
    expect(config.holdToShowKeys).toEqual(null);
    expect(config.keys).toEqual({
      toggleDefinition: [],
      nextDictionary: ['Shift', 'Enter'],
      startCopy: ['c'],
    });
    expect(config.contextMenuEnable).toEqual(true);
    expect(config.popupStyle).toEqual('blue');
    expect(config.noTextHighlight).toEqual(false);
    expect(config.showKanjiComponents).toEqual(true);
    expect(config.kanjiReferences).toEqual({
      H: true,
      L: true,
      E: true,
      KK: true,
      DK: true,
      N: true,
      V: true,
      Y: true,
      P: true,
      IN: true,
      I: true,
      U: true,
    });
  });

  it('reports changes to all listeners', async () => {
    const receivedChanges1: Array<ChangeDict> = [];
    const receivedChanges2: Array<ChangeDict> = [];

    const config = new Config();
    config.addChangeListener(change => {
      receivedChanges1.push(change);
    });
    config.addChangeListener(change => {
      receivedChanges2.push(change);
    });

    config.showKanjiComponents = false;
    config.showKanjiComponents = true;

    await new Promise(function checkForChanges(resolve) {
      if (receivedChanges1.length + receivedChanges2.length < 4) {
        setImmediate(() => {
          checkForChanges(resolve);
        });
      } else {
        resolve();
      }
    });

    expect(receivedChanges1).toEqual([
      { showKanjiComponents: { newValue: false } },
      { showKanjiComponents: { oldValue: false, newValue: true } },
    ]);
    expect(receivedChanges2).toEqual([
      { showKanjiComponents: { newValue: false } },
      { showKanjiComponents: { oldValue: false, newValue: true } },
    ]);
  });
});
