import '../html/options.html.src';

import Config from './config';
import { Command, CommandParams, isValidKey } from './commands';
import { translateDoc } from './l10n';

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
  // UA-specific styles
  if (isFirefox()) {
    document.documentElement.classList.add('firefox');
  }
  if (isChrome()) {
    document.documentElement.classList.add('chrome');
  }

  // Pop-up
  renderPopupStyleSelect();

  // Keyboard
  configureCommands();
  configureHoldToShowKeys();
  addPopupKeys();
  translateKeys();

  // TODO: Use REF_ABBREVIATIONS to generate the HTML for options.html too.

  // l10n
  translateDoc();

  for (const ref of Object.keys(config.kanjiReferences)) {
    document.getElementById(ref)!.addEventListener('click', evt => {
      config.updateKanjiReferences({
        [ref]: (evt.target as HTMLInputElement).checked,
      });
    });
  }

  document.getElementById('highlightText')!.addEventListener('click', evt => {
    config.noTextHighlight = !(evt.target as HTMLInputElement).checked;
  });

  document
    .getElementById('contextMenuEnable')!
    .addEventListener('click', evt => {
      config.contextMenuEnable = (evt.target as HTMLInputElement).checked;
    });

  document.getElementById('showDefinitions')!.addEventListener('click', evt => {
    config.readingOnly = !(evt.target as HTMLInputElement).checked;
    renderPopupStyleSelect();
  });

  document
    .getElementById('showKanjiComponents')!
    .addEventListener('click', evt => {
      config.showKanjiComponents = (evt.target as HTMLInputElement).checked;
    });
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

function renderPopupStyleSelect() {
  const popupStyleSelect = document.getElementById('popupstyle-select')!;
  while (popupStyleSelect.firstChild) {
    (popupStyleSelect.firstChild as any).remove();
  }
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

    const entry = document.createElement('div');
    entry.classList.add('entry');
    popupPreview.appendChild(entry);

    const spanKanji = document.createElement('span');
    spanKanji.classList.add('w-kanji');
    spanKanji.textContent = '理解';
    entry.appendChild(spanKanji);

    const spanKana = document.createElement('span');
    spanKana.classList.add('w-kana');
    spanKana.textContent = 'りかい';
    entry.appendChild(spanKana);

    const spanDef = document.createElement('span');
    spanDef.classList.add('w-def');
    let definition = '(n,vs)';
    if (!config.readingOnly) {
      definition += ' understanding';
    }
    spanDef.textContent = definition;
    entry.appendChild(spanDef);
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
      browser.i18n.getMessage('error_ctrl_alt_unsupported')
    );
  } else {
    setToggleKeyWarningState(
      'warning',
      browser.i18n.getMessage('error_ctrl_alt_warning')
    );
  }
}

function configureHoldToShowKeys() {
  const checkboxes = document.querySelectorAll(
    '.holdtoshowkeys input[type=checkbox][id^=show-]'
  );

  const getHoldToShowKeysValue = (): string | null => {
    const parts: Array<string> = [];

    for (const checkbox of checkboxes) {
      if ((checkbox as HTMLInputElement).checked) {
        parts.push((checkbox as HTMLInputElement).value);
      }
    }
    if (!parts.length) {
      return null;
    }
    return parts.join('+');
  };

  for (const checkbox of checkboxes) {
    checkbox.addEventListener('click', () => {
      config.holdToShowKeys = getHoldToShowKeysValue();
    });
  }
}

function addPopupKeys() {
  const grid = document.getElementById('key-grid')!;

  for (const setting of config.DEFAULT_KEY_SETTINGS) {
    // Don't show the copy entry if the clipboard API is not available
    if (
      setting.name === 'startCopy' &&
      (!navigator.clipboard ||
        typeof navigator.clipboard.writeText !== 'function')
    ) {
      continue;
    }

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
    keyDescription.textContent = browser.i18n.getMessage(setting.l10nKey);

    // Copy keys has an extended description.
    if (setting.name === 'startCopy') {
      const copyKeyList = document.createElement('ul');
      copyKeyList.classList.add('key-list');

      // XXX Move these copy key definitions somewhere central
      const copyKeys = [
        { key: 'e', l10nKey: 'options_popup_copy_entry' },
        { key: 't', l10nKey: 'options_popup_copy_fields' },
        { key: 'w', l10nKey: 'options_popup_copy_word_kanji' },
        // We just show the first key here. This matches what we show in the
        // pop-up too.
        { key: setting.keys[0], l10nKey: 'options_popup_copy_next' },
      ];

      for (const copyKey of copyKeys) {
        const item = document.createElement('li');
        item.classList.add('key');

        const keyLabel = document.createElement('label');
        const keySpan = document.createElement('span');
        keySpan.append(copyKey.key);
        keyLabel.append(keySpan);
        item.append(keyLabel);
        item.append(browser.i18n.getMessage(copyKey.l10nKey));

        copyKeyList.appendChild(item);
      }

      keyDescription.appendChild(copyKeyList);
    }

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

  const holdKeyParts: Array<string> =
    typeof config.holdToShowKeys === 'string'
      ? config.holdToShowKeys.split('+')
      : [];
  const holdKeyCheckboxes = document.querySelectorAll(
    '.holdtoshowkeys input[type=checkbox][id^=show-]'
  );
  for (const checkbox of holdKeyCheckboxes) {
    (checkbox as HTMLInputElement).checked = holdKeyParts.includes(
      (checkbox as HTMLInputElement).value
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
