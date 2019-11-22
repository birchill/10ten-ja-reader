import '../html/options.html.src';

import { DatabaseState } from '@birchill/hikibiki-data';

import { Config, DEFAULT_KEY_SETTINGS } from './config';
import { Command, CommandParams, isValidKey } from './commands';
import { CopyKeys, CopyNextKeyStrings } from './copy-keys';
import { dbLanguageNames, isDbLanguageId } from './db-languages';
import {
  DbStateUpdatedMessage,
  cancelDbUpdate,
  deleteDb,
  updateDb,
} from './db-listener-messages';
import { translateDoc } from './l10n';
import { getReferenceLabelsForLang, getReferencesForLang } from './refs';

const config = new Config();

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

  // Language
  fillInLanguages();

  // Kanji
  createKanjiReferences();

  // l10n
  translateDoc();

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

  document.getElementById('showRomaji')!.addEventListener('click', evt => {
    config.showRomaji = (evt.target as HTMLInputElement).checked;
    renderPopupStyleSelect();
  });

  document
    .getElementById('showKanjiComponents')!
    .addEventListener('click', evt => {
      config.showKanjiComponents = (evt.target as HTMLInputElement).checked;
    });

  browser.management.getSelf().then(info => {
    if (info.installType === 'development') {
      (document.querySelector('.db-admin') as HTMLElement).style.display =
        'block';
      document
        .getElementById('deleteDatabase')!
        .addEventListener('click', evt => {
          if (browserPort) {
            browserPort.postMessage(deleteDb());
          }
        });
    }
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
  empty(popupStyleSelect);
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

    const headingDiv = document.createElement('div');
    entry.append(headingDiv);

    const spanKanji = document.createElement('span');
    spanKanji.classList.add('w-kanji');
    spanKanji.textContent = '理解';
    headingDiv.appendChild(spanKanji);

    const spanKana = document.createElement('span');
    spanKana.classList.add('w-kana');
    spanKana.textContent = 'りかい';
    headingDiv.appendChild(spanKana);

    if (config.showRomaji) {
      const spanRomaji = document.createElement('span');
      spanRomaji.classList.add('w-romaji');
      spanRomaji.textContent = 'rikai';
      headingDiv.appendChild(spanRomaji);
    }

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
  const canConfigureCommands =
    typeof (browser.commands as any).update === 'function' &&
    typeof (browser.commands as any).reset === 'function';

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

  for (const setting of DEFAULT_KEY_SETTINGS) {
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
        config.updateKeys({
          [setting.name]: Array.from(checkedKeys).map(
            checkbox => (checkbox as HTMLInputElement).dataset.key
          ),
        });
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

      const copyKeys: Array<{
        key: string;
        l10nKey: string;
      }> = CopyKeys.map(({ key, optionsString }) => ({
        key,
        l10nKey: optionsString,
      }));
      copyKeys.push({
        // We just show the first key here. This matches what we show in the
        // pop-up too.
        key: setting.keys[0],
        l10nKey: CopyNextKeyStrings.optionsString,
      });

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

function fillInLanguages() {
  const select = document.querySelector('select#lang') as HTMLSelectElement;
  const currentValue = config.dictLang;

  for (const [id, title] of dbLanguageNames) {
    const option = document.createElement('option');
    option.value = id;
    if (id === currentValue) {
      option.selected = true;
    }
    option.append(title);
    select.append(option);
  }

  select.addEventListener('change', () => {
    if (!isDbLanguageId(select.value)) {
      // TODO: It would be nice to report to bugsnag here
      console.error(`Got unexpected language code: ${select.value}`);
      return;
    }
    config.dictLang = select.value;
  });
}

function createKanjiReferences() {
  const container = document.getElementById(
    'kanji-reference-list'
  ) as HTMLDivElement;

  const referenceNames = getReferenceLabelsForLang('en');
  for (const { ref, full } of referenceNames) {
    const rowDiv = document.createElement('div');
    rowDiv.classList.add('browser-style');
    rowDiv.classList.add('checkbox-row');

    const checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'checkbox');
    checkbox.setAttribute('id', `ref-${ref}`);
    checkbox.setAttribute('name', ref);
    checkbox.addEventListener('click', evt => {
      config.updateKanjiReferences({
        [ref]: (evt.target as HTMLInputElement).checked,
      });
    });

    rowDiv.append(checkbox);

    const label = document.createElement('label');
    label.setAttribute('for', `ref-${ref}`);
    label.textContent = full;
    rowDiv.append(label);

    container.append(rowDiv);
  }

  // We want to match the arrangement of references when they are displayed,
  // that is, in a vertically flowing grid. See comments where we generate the
  // popup styles for more explanation.
  //
  // We need to add 1 to the number of references, however, to accommodate the
  // "Kanji components" item.
  container.style.gridTemplateRows = `repeat(${Math.ceil(
    (referenceNames.length + 1) / 2
  )}, minmax(min-content, max-content))`;
}

function fillVals() {
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
    browser.runtime.sendMessage({
      type: 'reportWarning',
      message: `Unable to parse toggleKey: ${config.toggleKey}`,
    });
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

  const enabledReferences = new Set(config.kanjiReferences);
  for (const ref of getReferencesForLang('en')) {
    const checkbox = document.getElementById(`ref-${ref}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = enabledReferences.has(ref);
    }
  }
}

let browserPort: browser.runtime.Port | undefined;

function isDbStateUpdatedMessage(evt: unknown): evt is DbStateUpdatedMessage {
  return (
    typeof evt === 'object' &&
    typeof (evt as any).type === 'string' &&
    (evt as any).type === 'dbstateupdated'
  );
}

window.onload = async () => {
  await config.ready;
  completeForm();
  fillVals();
  config.addChangeListener(fillVals);

  // Listen to changes to the database.
  browserPort = browser.runtime.connect();
  browserPort.onMessage.addListener((evt: unknown) => {
    if (isDbStateUpdatedMessage(evt)) {
      updateDatabaseSummary(evt);
    }
  });
};

window.onunload = () => {
  config.removeChangeListener(fillVals);
  if (browserPort) {
    browserPort.disconnect();
    browserPort = undefined;
  }
};

function updateDatabaseSummary(evt: DbStateUpdatedMessage) {
  updateDatabaseBlurb(evt);
  updateDatabaseStatus(evt);
}

function updateDatabaseBlurb(evt: DbStateUpdatedMessage) {
  const blurb = document.querySelector('.db-summary-blurb')!;
  empty(blurb);

  const { kanjidb: kanjiDbVersion } = evt.versions;
  let attribution: string;
  if (kanjiDbVersion) {
    attribution = browser.i18n.getMessage(
      'options_kanji_data_source_with_version',
      [kanjiDbVersion.databaseVersion, kanjiDbVersion.dateOfCreation]
    );
  } else {
    attribution = browser.i18n.getMessage(
      'options_kanji_data_source_no_version'
    );
  }

  blurb.append(
    linkify(attribution, [
      {
        keyword: 'KANJIDIC',
        href: 'https://www.edrdg.org/wiki/index.php/KANJIDIC_Project',
      },
    ])
  );

  const license = browser.i18n.getMessage('options_kanji_license');
  const licenseKeyword = browser.i18n.getMessage(
    'options_kanji_license_keyword'
  );

  blurb.append(
    linkify(license, [
      {
        keyword: 'Electronic Dictionary Research and Development Group',
        href: 'https://www.edrdg.org/',
      },
      {
        keyword: licenseKeyword,
        href: 'https://www.edrdg.org/edrdg/licence.html',
      },
    ])
  );
}

function updateDatabaseStatus(evt: DbStateUpdatedMessage) {
  const { databaseState, updateState, versions } = evt;

  const status = document.querySelector('.db-summary-status')!;
  empty(status);
  status.classList.remove('-error');
  status.classList.remove('-warning');

  // Fill out the info part

  const infoDiv = document.createElement('div');
  infoDiv.classList.add('db-summary-info');

  switch (updateState.state) {
    case 'idle': {
      if (databaseState === DatabaseState.Empty) {
        infoDiv.append(browser.i18n.getMessage('options_no_database'));
      } else {
        infoDiv.classList.add('-italic');
        const { major, minor, patch } = versions.kanjidb!;

        const versionNumberDiv = document.createElement('div');
        const versionString = browser.i18n.getMessage(
          'options_kanji_db_version',
          `${major}.${minor}.${patch}`
        );
        versionNumberDiv.append(versionString);
        infoDiv.append(versionNumberDiv);

        if (updateState.lastCheck) {
          const lastCheckDiv = document.createElement('div');
          const lastCheckString = browser.i18n.getMessage(
            'options_last_database_check',
            formatDate(updateState.lastCheck)
          );
          lastCheckDiv.append(lastCheckString);
          infoDiv.append(lastCheckDiv);
        }
      }
      break;
    }

    case 'checking': {
      infoDiv.append(browser.i18n.getMessage('options_checking_for_updates'));
      break;
    }

    case 'downloading':
    case 'updatingdb': {
      const progressElem = document.createElement('progress');
      progressElem.classList.add('progress');
      if (updateState.state === 'downloading') {
        progressElem.max = 100;
        progressElem.value = updateState.progress * 100;
      }
      progressElem.id = 'kanjidb-progress';
      infoDiv.append(progressElem);

      const labelElem = document.createElement('label');
      labelElem.classList.add('label');
      labelElem.htmlFor = 'kanjidb-progress';

      const dbLabel = browser.i18n.getMessage(
        updateState.dbName === 'kanjidb'
          ? 'options_kanji_data_name'
          : 'options_bushu_data_name'
      );

      const { major, minor, patch } = updateState.downloadVersion;
      const versionString = `${major}.${minor}.${patch}`;

      if (updateState.state === 'downloading') {
        const progressAsPercent = Math.round(updateState.progress * 100);
        labelElem.textContent = browser.i18n.getMessage(
          'options_downloading_data',
          [dbLabel, versionString, String(progressAsPercent)]
        );
      } else {
        labelElem.textContent = browser.i18n.getMessage(
          'options_updating_data',
          [dbLabel, versionString]
        );
      }

      infoDiv.append(labelElem);
      break;
    }

    case 'error': {
      status.classList.add('-error');

      const messageDiv = document.createElement('div');
      const errorMessage = browser.i18n.getMessage(
        'options_db_update_error',
        updateState.error.message
      );
      messageDiv.append(errorMessage);
      infoDiv.append(messageDiv);

      if (updateState.nextRetry) {
        const nextRetryDiv = document.createElement('div');
        const nextRetryString = browser.i18n.getMessage(
          'options_db_update_next_retry',
          formatDate(updateState.nextRetry)
        );
        nextRetryDiv.append(nextRetryString);
        infoDiv.append(nextRetryDiv);
      }
      break;
    }

    case 'offline':
      status.classList.add('-warning');
      infoDiv.append(browser.i18n.getMessage('options_offline_explanation'));
      break;
  }

  status.append(infoDiv);

  // Add the action button info any

  const buttonDiv = document.createElement('div');
  buttonDiv.classList.add('db-summary-button');

  switch (updateState.state) {
    case 'idle':
    case 'error': {
      const updateButton = document.createElement('button');
      updateButton.classList.add('browser-style');
      updateButton.setAttribute('type', 'button');
      updateButton.textContent = browser.i18n.getMessage(
        updateState.state === 'idle'
          ? 'options_update_check_button_label'
          : 'options_update_retry_button_label'
      );
      updateButton.addEventListener('click', triggerDatabaseUpdate);
      buttonDiv.append(updateButton);
      break;
    }

    case 'checking':
    case 'downloading':
    case 'updatingdb': {
      const cancelButton = document.createElement('button');
      cancelButton.classList.add('browser-style');
      cancelButton.setAttribute('type', 'button');
      cancelButton.textContent = browser.i18n.getMessage(
        'options_cancel_update_button_label'
      );
      if (updateState.state === 'updatingdb') {
        cancelButton.disabled = true;
      } else {
        cancelButton.addEventListener('click', cancelDatabaseUpdate);
      }
      buttonDiv.append(cancelButton);
      break;
    }
  }

  status.append(buttonDiv);
}

function empty(elem: Element) {
  while (elem.firstChild) {
    (elem.firstChild as any).remove();
  }
}

function linkify(
  source: string,
  replacements: Array<{ keyword: string; href: string }>
): DocumentFragment {
  const matchedReplacements: Array<{
    index: number;
    keyword: string;
    href: string;
  }> = [];

  for (const replacement of replacements) {
    const index = source.indexOf(replacement.keyword);
    if (index !== -1) {
      matchedReplacements.push({ index, ...replacement });
    }
  }
  matchedReplacements.sort((a, b) => a.index - b.index);

  const result = new DocumentFragment();
  let position = 0;

  for (const replacement of matchedReplacements) {
    if (position < replacement.index) {
      result.append(source.substring(position, replacement.index));
    }

    const link = document.createElement('a');
    link.href = replacement.href;
    link.target = '_blank';
    link.textContent = replacement.keyword;
    result.append(link);

    position = replacement.index + replacement.keyword.length;
  }

  if (position < source.length) {
    result.append(source.substring(position, source.length));
  }

  return result;
}

// Our special date formatting that is a simplified ISO 8601 in local time
// without seconds.
function formatDate(date: Date): string {
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function triggerDatabaseUpdate() {
  if (!browserPort) {
    return;
  }

  browserPort.postMessage(updateDb());
}

function cancelDatabaseUpdate() {
  if (!browserPort) {
    return;
  }

  browserPort.postMessage(cancelDbUpdate());
}
