import '../html/options.html.src';

import Config from './config';
import { Command, CommandParams } from './commands';

declare global {
  interface Window {
    rcxMain: { config: Config };
  }
}

const config = browser.extension.getBackgroundPage().rcxMain.config;

const canConfigureCommands =
  typeof (browser.commands as any).update === 'function' &&
  typeof (browser.commands as any).reset === 'function';

function completeForm() {
  addPopupStyleSelect();

  const hotkeys = document.querySelectorAll('input[type=text].hotkey');
  for (const hotkey of hotkeys) {
    (hotkey as HTMLInputElement).disabled = !canConfigureCommands;
  }

  addPopupKeys();

  // TODO: Use REF_ABBREVIATIONS to generate the HTML for options.html too.

  for (const ref of Object.keys(config.kanjiReferences)) {
    document.getElementById(ref)!.addEventListener('click', evt => {
      config.updateKanjiReferences({
        [ref]: (evt.target as HTMLInputElement).checked,
      });
    });
  }

  document.getElementById('showDefinitions')!.addEventListener('click', evt => {
    config.readingOnly = !(evt.target as HTMLInputElement).checked;
  });

  document.getElementById('highlightText')!.addEventListener('click', evt => {
    config.noTextHighlight = !(evt.target as HTMLInputElement).checked;
  });

  document
    .getElementById('contextMenuEnable')!
    .addEventListener('click', evt => {
      config.contextMenuEnable = (evt.target as HTMLInputElement).checked;
    });

  document
    .getElementById('showKanjiComponents')!
    .addEventListener('click', evt => {
      config.showKanjiComponents = (evt.target as HTMLInputElement).checked;
    });
}

function addPopupStyleSelect() {
  const popupStyleSelect = document.getElementById('popupstyle-select')!;
  const themes = ['blue', 'lightblue', 'black', 'yellow'];

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

    const popupPreview = document.createElement('div');
    popupPreview.setAttribute('id', 'rikaichamp-window');
    popupPreview.classList.add('popup-preview');
    popupPreview.classList.add(`-${theme}`);
    label.appendChild(popupPreview);

    const spanKanji = document.createElement('span');
    spanKanji.classList.add('w-kanji');
    spanKanji.textContent = '理解';
    popupPreview.appendChild(spanKanji);

    const spanKana = document.createElement('span');
    spanKana.classList.add('w-kana');
    spanKana.textContent = 'りかい';
    popupPreview.appendChild(spanKana);

    const spanDef = document.createElement('span');
    spanDef.classList.add('w-def');
    spanDef.textContent = '(n,vs) understanding';
    popupPreview.appendChild(spanDef);
  }
}

function addPopupKeys() {
  const grid = document.getElementById('key-grid')!;

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

      keyInput.addEventListener('click', evt => {
        const checkedKeys = document.querySelectorAll(
          `input[type=checkbox].key-${setting.name}:checked`
        );
        // We need to use postMessage so that the Array is cloned into the
        // background page's compartment.
        const backgroundWindow = browser.extension.getBackgroundPage();
        backgroundWindow.postMessage(
          {
            type: 'updateKeys',
            keys: {
              [setting.name]: Array.from(checkedKeys).map(
                checkbox => (checkbox as HTMLInputElement).dataset.key
              ),
            },
          },
          window.location.origin
        );
      });

      const keyLabel = document.createElement('label');
      keyLabel.setAttribute('for', `key-${setting.name}-${key}`);

      // We need to add an extra span inside in order to be able to get
      // consistent layout when using older versions of extensions.css that put
      // the checkbox in a pseudo.
      const keyLabelSpan = document.createElement('span');
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
}

async function fillVals() {
  await config.ready;

  const optform = document.getElementById('optform') as HTMLFormElement;
  optform.showDefinitions.checked = !config.readingOnly;
  optform.highlightText.checked = !config.noTextHighlight;
  optform.contextMenuEnable.checked = config.contextMenuEnable;
  optform.showKanjiComponents.checked = config.showKanjiComponents;
  optform.popupStyle.value = config.popupStyle;

  try {
    const toggleCommand = Command.fromString(config.toggleKey);
    const getToggleControl = (part: string): HTMLInputElement =>
      document.getElementById(`toggle-${part}`) as HTMLInputElement;
    getToggleControl('alt').checked = toggleCommand.alt;
    getToggleControl('ctrl').checked = toggleCommand.ctrl;
    getToggleControl('shift').checked = toggleCommand.shift;
    getToggleControl('key').value = toggleCommand.key;
  } catch (e) {
    // TODO: Tell bugsnag about this
  }

  for (const [setting, keys] of Object.entries(config.keys)) {
    const checkboxes = document.querySelectorAll(
      `input[type=checkbox].key-${setting}`
    );
    for (const checkbox of checkboxes) {
      (checkbox as HTMLInputElement).checked = keys.includes(
        (checkbox as HTMLInputElement).dataset.key
      );
    }
  }

  for (const [abbrev, setting] of Object.entries(config.kanjiReferences)) {
    (document.getElementById(abbrev) as HTMLInputElement).checked = setting;
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
