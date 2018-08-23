import '../html/options.html.src';

import Config from './config';
import { Command, CommandParams, isValidKey } from './commands';

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
  // Basic styles
  if (isFirefox()) {
    document.documentElement.classList.add('firefox');
  }
  if (isChrome()) {
    document.documentElement.classList.add('chrome');
  }

  // Pop-up
  addPopupStyleSelect();

  // Keyboard
  configureCommands();
  addPopupKeys();
  translateKeys();

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

function configureCommands() {
  // Disable any controls associated with configuring browser.commands if the
  // necessary APIs are not available.
  const browserCommandControls = document.querySelectorAll(
    '.key.command input'
  );
  for (const control of browserCommandControls) {
    (control as HTMLInputElement).disabled = !canConfigureCommands;
  }

  if (!canConfigureCommands) {
    return;
  }

  const getToggleShortcut = (): Command => {
    const getControl = (part: string): HTMLInputElement => {
      return document.getElementById(`toggle-${part}`) as HTMLInputElement;
    };

    const params: CommandParams = {
      alt: getControl('alt').checked,
      ctrl: getControl('ctrl').checked,
      shift: getControl('shift').checked,
      key: getControl('key').value,
    };

    return Command.fromParams(params);
  };

  const updateToggleKey = () => {
    try {
      const shortcut = getToggleShortcut();
      config.toggleKey = shortcut.toString();
      showToggleCommandSupport(shortcut);
    } catch (e) {
      setToggleKeyWarningState('error', e.message);
    }
  };

  const toggleKeyCheckboxes = document.querySelectorAll(
    '.command input[type=checkbox][id^=toggle-]'
  );
  for (const checkbox of toggleKeyCheckboxes) {
    checkbox.addEventListener('click', updateToggleKey);
  }

  const toggleKeyTextbox = document.getElementById(
    'toggle-key'
  ) as HTMLInputElement;
  toggleKeyTextbox.addEventListener('keydown', evt => {
    let key = evt.key;
    if (evt.key.length === 1) {
      key = key.toUpperCase();
    }

    if (!isValidKey(key)) {
      // Most printable keys are one character in length so make sure we don't
      // allow the default action of adding them to the text input. For other
      // keys we don't handle though (e.g. Tab) we probably want to allow the
      // default action.
      if (evt.key.length === 1) {
        evt.preventDefault();
      }
      return;
    }

    toggleKeyTextbox.value = key;
    evt.preventDefault();
    updateToggleKey();
  });

  toggleKeyTextbox.addEventListener('compositionstart', evt => {
    toggleKeyTextbox.value = '';
  });
  toggleKeyTextbox.addEventListener('compositionend', evt => {
    toggleKeyTextbox.value = toggleKeyTextbox.value.toUpperCase();
    updateToggleKey();
  });
}

type WarningState = 'ok' | 'warning' | 'error';

function setToggleKeyWarningState(state: WarningState, message?: string) {
  const icon = document.getElementById('toggle-key-icon')!;
  icon.classList.toggle('-warning', state === 'warning');
  icon.classList.toggle('-error', state === 'error');
  if (message) {
    icon.setAttribute('title', message);
  } else {
    icon.removeAttribute('title');
  }
}

function isFirefox(): boolean {
  return navigator.userAgent.indexOf('Firefox/') !== -1;
}

function isChrome(): boolean {
  return (
    navigator.userAgent.indexOf('Chrome/') !== -1 ||
    navigator.userAgent.indexOf('Chromium/') !== -1
  );
}

function getFirefoxMajorVersion(): number | null {
  const matches = navigator.userAgent.match(/Firefox\/(\d+)/);
  if (matches === null || matches.length < 2) {
    return null;
  }

  const majorVersion = parseInt(matches[1]);
  return majorVersion === 0 ? null : majorVersion;
}

function showToggleCommandSupport(command: Command) {
  // Key sequences with a secondary modifier other than Shift are only
  // supported prior to Firefox 63. Show a warning or error depending on
  // whether or not we are prior to Firefox 63.
  if (!command.usesExpandedModifierSet()) {
    setToggleKeyWarningState('ok');
    return;
  }

  const firefoxMajorVersion = getFirefoxMajorVersion();
  if (firefoxMajorVersion !== null && firefoxMajorVersion < 63) {
    setToggleKeyWarningState(
      'error',
      'Combining Alt and Ctrl is not supported in this version of Firefox'
    );
  } else {
    setToggleKeyWarningState(
      'warning',
      'Combining Alt and Ctrl is not supported in earlier versions of Firefox (prior to 63)'
    );
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

function translateKeys() {
  const isMac = /^Mac/i.test(navigator.platform);
  if (!isMac) {
    return;
  }

  const keyLabels = document.querySelectorAll('.key > label > span');
  for (const label of keyLabels) {
    if (label.textContent === 'Ctrl') {
      label.textContent = '⌘';
    } else if (label.textContent === 'Alt') {
      label.textContent = 'Option';
    }
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
    showToggleCommandSupport(toggleCommand);
  } catch (e) {
    const backgroundWindow = browser.extension.getBackgroundPage();
    backgroundWindow.postMessage(
      {
        type: 'reportWarning',
        message: `Unable to parse toggleKey: ${config.toggleKey}`,
      },
      window.location.origin
    );
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
