const REF_ABBREVIATIONS = [
  /*
    C: 'Classical Radical',
    DR: 'Father Joseph De Roo Index',
    DO: 'P.G. O\'Neill Index',
    O: 'P.G. O\'Neill Japanese Names Index',
    Q: 'Four Corner Code',
    MN: 'Morohashi Daikanwajiten Index',
    MP: 'Morohashi Daikanwajiten Volume/Page',
    K: 'Gakken Kanji Dictionary Index',
    W: 'Korean Reading',
    */
  { abbrev: 'H', name: 'Halpern' },
  { abbrev: 'L', name: 'Heisig' },
  { abbrev: 'E', name: 'Henshall' },
  { abbrev: 'DK', name: 'Kanji Learners Dictionary' },
  { abbrev: 'N', name: 'Nelson' },
  { abbrev: 'V', name: 'New Nelson' },
  { abbrev: 'Y', name: 'PinYin' },
  { abbrev: 'P', name: 'Skip Pattern' },
  { abbrev: 'IN', name: 'Tuttle Kanji & Kana' },
  { abbrev: 'I', name: 'Tuttle Kanji Dictionary' },
  { abbrev: 'U', name: 'Unicode' },
];

class Config {
  constructor() {
    this._settings = {};
    this._changeListeners = [];
    this.DEFAULT_KEY_SETTINGS = [
      {
        name: 'nextDictionary',
        keys: ['Shift', 'Enter'],
        description: 'Switch dictionaries',
      },
      {
        name: 'toggleDefinition',
        keys: ['d'],
        description: 'Toggle definition',
      },
    ];
    this.DEFAULT_KEYS = this.DEFAULT_KEY_SETTINGS.reduce(
      (defaultKeys, setting) => {
        defaultKeys[setting.name] = setting.keys;
        return defaultKeys;
      },
      {}
    );
    this._readPromise = this._readSettings();
    this.onChange = this.onChange.bind(this);
  }

  async _readSettings() {
    this._settings = {};
  }

  get ready() {
    return this._readPromise;
  }

  onChange(changes, areaName) {
    if (areaName !== 'sync') {
      return;
    }
    for (const listener of this._changeListeners) {
      listener(changes);
    }
  }

  addChangeListener(callback) {
    if (this._changeListeners.indexOf(callback) !== -1) {
      return;
    }
    this._changeListeners.push(callback);
  }

  removeChangeListener(callback) {
    const index = this._changeListeners.indexOf(callback);
    if (index === -1) {
      return;
    }
    this._changeListeners.splice(index, 1);
  }

  // accentDisplay: Defaults to 'binary'
  get accentDisplay() {
    return typeof this._settings.accentDisplay === 'undefined'
      ? 'binary'
      : this._settings.accentDisplay;
  }
  set accentDisplay(value) {
    if (
      typeof this._settings.accentDisplay !== 'undefined' &&
      this._settings.accentDisplay === value
    ) {
      return;
    }
    this._settings.accentDisplay = value;
  }

  // readingOnly: Defaults to false
  get readingOnly() {
    return !!this._settings.readingOnly;
  }
  set readingOnly(value) {
    if (
      typeof this._settings.readingOnly !== 'undefined' &&
      this._settings.readingOnly === value
    ) {
      return;
    }
    this._settings.readingOnly = value;
  }
  toggleReadingOnly() {
    this.readingOnly = !this._settings.readingOnly;
  }

  // keys: Defaults are defined by DEFAULT_KEYS
  get keys() {
    const setValues = this._settings.keys || {};
    return Object.assign({}, this.DEFAULT_KEYS, setValues);
  }
  updateKeys(keys) {
    const existingSettings = this._settings.keys || {};
    this._settings.keys = Object.assign({}, existingSettings, keys);
  }

  // popupStyle: Defaults to 'default'
  get popupStyle() {
    return typeof this._settings.popupStyle === 'undefined'
      ? 'default'
      : this._settings.popupStyle;
  }
  set popupStyle(value) {
    if (
      typeof this._settings.popupStyle !== 'undefined' &&
      this._settings.popupStyle === value
    ) {
      return;
    }
    this._settings.popupStyle = value;
  }

  // posDisplay: Defaults to 'expl'
  get posDisplay() {
    return typeof this._settings.posDisplay === 'undefined'
      ? 'expl'
      : this._settings.posDisplay;
  }
  set posDisplay(value) {
    if (
      typeof this._settings.posDisplay !== 'undefined' &&
      this._settings.posDisplay === value
    ) {
      return;
    }
    this._settings.posDisplay = value;
  }

  // contextMenuEnable: Defaults to true
  get contextMenuEnable() {
    return (
      typeof this._settings.contextMenuEnable === 'undefined' ||
      this._settings.contextMenuEnable
    );
  }
  set contextMenuEnable(value) {
    if (
      typeof this._settings.contextMenuEnable !== 'undefined' &&
      this._settings.contextMenuEnable === value
    ) {
      return;
    }
    this._settings.contextMenuEnable = value;
  }

  // noTextHighlight: Defaults to false
  get noTextHighlight() {
    return !!this._settings.noTextHighlight;
  }
  set noTextHighlight(value) {
    if (
      typeof this._settings.noTextHighlight !== 'undefined' &&
      this._settings.noTextHighlight === value
    ) {
      return;
    }
    this._settings.noTextHighlight = value;
  }

  // showKanjiComponents: Defaults to true
  get showKanjiComponents() {
    return (
      typeof this._settings.showKanjiComponents === 'undefined' ||
      this._settings.showKanjiComponents
    );
  }
  set showKanjiComponents(value) {
    this._settings.showKanjiComponents = value;
  }

  // showPriority: Defaults to true
  get showPriority() {
    return (
      typeof this._settings.showPriority === 'undefined' ||
      this._settings.showPriority
    );
  }
  set showPriority(value) {
    this._settings.showPriority = value;
  }

  // kanjiReferences: Defaults to true for all items in REF_ABBREVIATION
  get kanjiReferences() {
    const setValues = this._settings.kanjiReferences || {};
    const result = {};
    for (const ref of REF_ABBREVIATIONS) {
      result[ref.abbrev] =
        typeof setValues[ref.abbrev] === 'undefined' || setValues[ref.abbrev];
    }
    return result;
  }
  updateKanjiReferences(value) {
    const existingSettings = this._settings.kanjiReferences || {};
    this._settings.kanjiReferences = Object.assign({}, existingSettings, value);
  }

  // tabDisplay: Defaults to top
  get tabDisplay() {
    return typeof this._settings.tabDisplay === 'undefined'
      ? 'top'
      : this._settings.tabDisplay;
  }

  set tabDisplay(value) {
    if (
      typeof this._settings.tabDisplay !== 'undefined' &&
      this._settings.tabDisplay === value
    ) {
      return;
    }

    this._settings.tabDisplay = value;
  }

  // Get all the options the content process cares about at once
  get contentConfig() {
    return {
      accentDisplay: this.accentDisplay,
      readingOnly: this.readingOnly,
      keys: this.keys,
      noTextHighlight: this.noTextHighlight,
      popupStyle: this.popupStyle,
      posDisplay: this.posDisplay,
      showPriority: this.showPriority,
      tabDisplay: this.tabDisplay,
    };
  }
}

const config = new Config();

function completeForm() {
  const popupStyleSelect = document.getElementById('popupstyle-select');
  const themes = ['default', 'light', 'blue', 'lightblue', 'black', 'yellow'];

  for (const theme of themes) {
    const input = document.createElement('input');
    input.setAttribute('type', 'radio');
    input.setAttribute('name', 'popupStyle');
    input.setAttribute('value', theme);
    input.setAttribute('id', `popupstyle-${theme}`);
    popupStyleSelect.appendChild(input);

    input.addEventListener('click', () => {
      config.popupStyle = theme;
    });

    const label = document.createElement('label');
    label.setAttribute('for', `popupstyle-${theme}`);
    popupStyleSelect.appendChild(label);

    // The default theme alternates between light and dark so we need to
    // generate two popup previews and overlay them.
    if (theme === 'default') {
      const popupPreviewContainer = document.createElement('div');
      popupPreviewContainer.classList.add('overlay');
      popupPreviewContainer.appendChild(renderPopupPreview('light'));
      popupPreviewContainer.appendChild(renderPopupPreview('black'));
      label.appendChild(popupPreviewContainer);
    } else {
      label.appendChild(renderPopupPreview(theme));
    }
  }

  const grid = document.getElementById('key-grid');
  for (const setting of config.DEFAULT_KEY_SETTINGS) {
    const keyBlock = document.createElement('div');
    keyBlock.classList.add('key');
    keyBlock.classList.add('browser-style');
    for (const key of setting.keys) {
      const keyInput = document.createElement('input');
      keyInput.setAttribute('type', 'checkbox');
      keyInput.setAttribute('id', `key-${setting.name}-${key}`);
      keyInput.setAttribute('name', `key-${setting.name}-${key}`);
      keyInput.classList.add(`key-${setting.name}`);
      keyInput.dataset.key = key;
      keyBlock.appendChild(keyInput);
      keyInput.addEventListener('click', (evt) => {
        const checkedKeys = document.querySelectorAll(
          `input[type=checkbox].key-${setting.name}:checked`
        );
        // We need to use postMessage so that the Array is cloned into the
        // background page's compartment.
        const keys = {
          [setting.name]: Array.from(checkedKeys).map(
            (checkbox) => checkbox.dataset.key
          ),
        };
        console.log(`Would set ${JSON.stringify(keys)}`);
      });
      const keyLabel = document.createElement('label');
      keyLabel.setAttribute('for', `key-${setting.name}-${key}`);
      const keyLabelSpan = document.createElement('span');
      keyLabelSpan.classList.add('key-box');
      keyLabelSpan.textContent = key;
      keyLabel.appendChild(keyLabelSpan);
      keyBlock.appendChild(keyLabel);
    }
    grid.appendChild(keyBlock);
    const keyDescription = document.createElement('div');
    keyDescription.classList.add('key-description');
    keyDescription.textContent = setting.description;
    grid.appendChild(keyDescription);
  }

  // TODO: Use REF_ABBREVIATIONS to generate the HTML for options.html too.
  for (const ref of Object.keys(config.kanjiReferences)) {
    document.getElementById(ref).addEventListener('click', (evt) => {
      config.updateKanjiReferences({
        [ref]: evt.target.checked,
      });
    });
  }

  document
    .getElementById('showDefinitions')
    .addEventListener('click', (evt) => {
      config.readingOnly = !evt.target.checked;
    });
  document.getElementById('highlightText').addEventListener('click', (evt) => {
    config.noTextHighlight = !evt.target.checked;
  });
  document
    .getElementById('contextMenuEnable')
    .addEventListener('click', (evt) => {
      config.contextMenuEnable = evt.target.checked;
    });
  document
    .getElementById('showKanjiComponents')
    .addEventListener('click', (evt) => {
      config.showKanjiComponents = evt.target.checked;
    });
}

function renderPopupPreview(theme) {
  const popupPreview = document.createElement('div');
  popupPreview.classList.add('popup-preview');
  popupPreview.classList.add('window');
  popupPreview.classList.add(`theme-${theme}`);

  const entry = document.createElement('div');
  entry.classList.add('entry');
  popupPreview.appendChild(entry);

  const headingDiv = document.createElement('div');
  entry.append(headingDiv);

  const spanKanji = document.createElement('span');
  spanKanji.classList.add('w-kanji');
  spanKanji.textContent = '理解';
  if (config.showPriority) {
    spanKanji.append(renderStar());
  }
  headingDiv.appendChild(spanKanji);

  const spanKana = document.createElement('span');
  spanKana.classList.add('w-kana');

  switch (config.accentDisplay) {
    case 'downstep':
      spanKana.textContent = 'りꜜかい';
      break;

    case 'binary':
      {
        const spanWrapper = document.createElement('span');
        spanWrapper.classList.add('w-binary');

        const spanRi = document.createElement('span');
        spanRi.classList.add('h-l');
        spanRi.textContent = 'り';
        spanWrapper.append(spanRi);

        const spanKai = document.createElement('span');
        spanKai.classList.add('l');
        spanKai.textContent = 'かい';
        spanWrapper.append(spanKai);

        spanKana.append(spanWrapper);
      }
      break;

    case 'none':
      spanKana.textContent = 'りかい';
      break;
  }

  if (config.showPriority) {
    spanKana.append(renderStar());
  }
  headingDiv.appendChild(spanKana);

  if (config.showRomaji) {
    const spanRomaji = document.createElement('span');
    spanRomaji.classList.add('w-romaji');
    spanRomaji.textContent = 'rikai';
    headingDiv.appendChild(spanRomaji);
  }

  if (!config.readingOnly) {
    const spanDef = document.createElement('span');

    if (config.posDisplay !== 'none') {
      const posSpan = document.createElement('span');
      posSpan.classList.add('w-pos', 'tag');
      switch (config.posDisplay) {
        case 'expl':
          {
            const labels = { n: 'noun', vs: '+suru verb' };
            posSpan.append(['n', 'vs'].map((pos) => labels[pos]).join(', '));
          }
          break;

        case 'code':
          posSpan.append('n, vs');
          break;
      }
      spanDef.append(posSpan);
    }

    spanDef.classList.add('w-def');
    spanDef.append('\u200bunderstanding');

    entry.appendChild(spanDef);
  }

  return popupPreview;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function renderStar() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('svgicon');
  svg.style.opacity = '0.5';
  svg.setAttribute('viewBox', '0 0 98.6 93.2');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    'M98 34a4 4 0 00-3-1l-30-4L53 2a4 4 0 00-7 0L33 29 4 33a4 4 0 00-3 6l22 20-6 29a4 4 0 004 5 4 4 0 002 0l26-15 26 15a4 4 0 002 0 4 4 0 004-4 4 4 0 000-1l-6-29 22-20a4 4 0 001-5z'
  );
  svg.append(path);

  return svg;
}

async function fillVals() {
  await config.ready;
  const optform = document.getElementById('optform');
  optform.showDefinitions.checked = !config.readingOnly;
  optform.highlightText.checked = !config.noTextHighlight;
  optform.contextMenuEnable.checked = config.contextMenuEnable;
  optform.showKanjiComponents.checked = config.showKanjiComponents;
  optform.popupStyle.value = config.popupStyle;
  optform.tabDisplay.value = config.tabDisplay;
  for (const [setting, keys] of Object.entries(config.keys)) {
    const checkboxes = document.querySelectorAll(
      `input[type=checkbox].key-${setting}`
    );
    for (const checkbox of checkboxes) {
      checkbox.checked = keys.includes(checkbox.dataset.key);
    }
  }
  for (const [abbrev, setting] of Object.entries(config.kanjiReferences)) {
    document.getElementById(abbrev).checked = setting;
  }
}

window.onload = () => {
  completeForm();
  fillVals();
  config.addChangeListener(fillVals);
};

window.onunload = () => {
  config.removeChangeListener(fillVals);
};
