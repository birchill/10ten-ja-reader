import '../../html/options.html.src';

import {
  allDataSeries,
  allMajorDataSeries,
  DataSeries,
  DataSeriesState,
  MajorDataSeries,
} from '@birchill/hikibiki-data';
import Bugsnag from '@bugsnag/browser';
import Browser, { browser } from 'webextension-polyfill-ts';

import { Config, DEFAULT_KEY_SETTINGS } from '../common/config';
import {
  AccentDisplay,
  PartOfSpeechDisplay,
  TabDisplay,
} from '../common/content-config';
import { CopyKeys, CopyNextKeyStrings } from '../common/copy-keys';
import { dbLanguageMeta, isDbLanguageId } from '../common/db-languages';
import {
  DbStateUpdatedMessage,
  cancelDbUpdate,
  deleteDb,
  updateDb,
} from '../common/db-listener-messages';
import {
  getReferenceLabelsForLang,
  getReferencesForLang,
} from '../common/refs';
import { startBugsnag } from '../utils/bugsnag';
import {
  isChromium,
  isEdge,
  isFenix,
  isFirefox,
  isMac,
  isSafari,
} from '../utils/ua-utils';
import { getThemeClass } from '../utils/themes';

import { Command, CommandParams, isValidKey } from './commands';
import { translateDoc } from './l10n';

declare global {
  namespace Intl {
    type RelativeTimeFormatLocaleMatcher = 'lookup' | 'best fit';

    type RelativeTimeFormatStyle = 'long' | 'short' | 'narrow';

    interface DisplayNamesOptions {
      localeMatcher: RelativeTimeFormatLocaleMatcher;
      style: RelativeTimeFormatStyle;
      type: 'language' | 'region' | 'script' | 'currency';
      fallback: 'code' | 'none';
    }

    interface DisplayNames {
      of(code: string): string;
    }

    const DisplayNames: {
      prototype: DisplayNames;
      new (
        locales?: string | string[],
        options?: Partial<DisplayNamesOptions>
      ): DisplayNames;
    };
  }
}

startBugsnag();

const config = new Config();

function completeForm() {
  // UA-specific styles

  // We only add the 'firefox' class on desktop Firefox since Fenix doesn't
  // include browser styles.
  if (isFirefox() && !isFenix()) {
    document.documentElement.classList.add('firefox');
  }
  if (isChromium()) {
    document.documentElement.classList.add('chromium');
  }
  if (isEdge()) {
    document.documentElement.classList.add('edge');
  }
  if (isSafari()) {
    document.documentElement.classList.add('safari');
  }

  // Pop-up
  renderPopupStyleSelect();
  setTabDisplayTheme(config.popupStyle);
  // Refresh the theme used in the tab preview if the dark mode setting changes
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      setTabDisplayTheme(config.popupStyle);
    });

  // Keyboard
  configureCommands();
  configureHoldToShowKeys();
  addPopupKeys();
  translateKeys();

  // Puck
  configurePuckSettings();

  // Language
  fillInLanguages();

  // Kanji
  createKanjiReferences();

  // l10n
  translateDoc();

  document.getElementById('highlightText')!.addEventListener('click', (evt) => {
    config.noTextHighlight = !(evt.target as HTMLInputElement).checked;
  });

  document
    .getElementById('contextMenuEnable')!
    .addEventListener('click', (evt) => {
      config.contextMenuEnable = (evt.target as HTMLInputElement).checked;
    });

  const toolbarIconOptions = Array.from(
    document.querySelectorAll('input[type=radio][name=toolbarIcon]')
  );
  for (const option of toolbarIconOptions) {
    option.addEventListener('change', (evt) => {
      const toolbarIcon = (evt.target as HTMLInputElement).value as
        | 'default'
        | 'sky';
      config.toolbarIcon = toolbarIcon;
    });
  }

  document.getElementById('showPriority')!.addEventListener('click', (evt) => {
    config.showPriority = (evt.target as HTMLInputElement).checked;
    renderPopupStyleSelect();
  });

  document.getElementById('showRomaji')!.addEventListener('click', (evt) => {
    config.showRomaji = (evt.target as HTMLInputElement).checked;
    renderPopupStyleSelect();
  });

  document
    .getElementById('showDefinitions')!
    .addEventListener('click', (evt) => {
      config.readingOnly = !(evt.target as HTMLInputElement).checked;
      renderPopupStyleSelect();
    });

  document.getElementById('accentDisplay')!.addEventListener('input', (evt) => {
    config.accentDisplay = (evt.target as HTMLSelectElement)
      .value as AccentDisplay;
    renderPopupStyleSelect();
  });

  document.getElementById('posDisplay')!.addEventListener('input', (evt) => {
    config.posDisplay = (evt.target as HTMLSelectElement)
      .value as PartOfSpeechDisplay;
    renderPopupStyleSelect();
  });

  const tabDisplayOptions = Array.from(
    document.querySelectorAll('input[type=radio][name=tabDisplay]')
  );
  for (const option of tabDisplayOptions) {
    option.addEventListener('change', (evt) => {
      const tabDisplay = (evt.target as HTMLInputElement).value as TabDisplay;
      config.tabDisplay = tabDisplay;
    });
  }

  document.getElementById('fxCurrency')!.addEventListener('input', (evt) => {
    config.fxCurrency = (evt.target as HTMLSelectElement).value;
  });

  document
    .getElementById('forceGdocsHtmlMode')!
    .addEventListener('click', (evt) => {
      config.forceGdocsHtmlMode = (evt.target as HTMLInputElement).checked;
    });

  document
    .getElementById('showKanjiComponents')!
    .addEventListener('click', (evt) => {
      config.showKanjiComponents = (evt.target as HTMLInputElement).checked;
    });

  if (browser.management) {
    browser.management.getSelf().then((info) => {
      if (info.installType === 'development') {
        (document.querySelector('.db-admin') as HTMLElement).style.display =
          'block';
        document
          .getElementById('deleteDatabase')!
          .addEventListener('click', (evt) => {
            if (browserPort) {
              browserPort.postMessage(deleteDb());
            }
          });
      }
    });
  }
}

function renderPopupStyleSelect() {
  const popupStyleSelect = document.getElementById('popupstyle-select')!;
  empty(popupStyleSelect);
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
      setTabDisplayTheme(theme);
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
}

function renderPopupPreview(theme: string): HTMLElement {
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
          posSpan.append(
            ['n', 'vs']
              .map((pos) => browser.i18n.getMessage(`pos_label_${pos}`) || pos)
              .join(', ')
          );
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

function renderStar(): SVGElement {
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

function setTabDisplayTheme(theme: string) {
  const tabIcons = Array.from(
    document.querySelectorAll('.tabdisplay-select .tabicon')
  );

  const themeClass = getThemeClass(theme);
  for (const tabIcon of tabIcons) {
    for (const className of tabIcon.classList.values()) {
      if (className.startsWith('theme-')) {
        tabIcon.classList.remove(className);
      }
    }
    tabIcon.classList.add(themeClass);
  }
}

function renderCurrencyList(
  selectedCurrency: string,
  currencies: Array<string> | undefined
) {
  const heading = document.querySelector<HTMLDivElement>('.currency-heading')!;
  const body = document.querySelector<HTMLDivElement>('.currency-body')!;

  if (!currencies || !currencies.length) {
    heading.style.display = 'none';
    body.style.display = 'none';
    return;
  }

  heading.style.display = 'revert';
  body.style.display = 'revert';

  // Drop all the existing currencies since the set of currencies may have
  // changed
  const fxCurrency = document.getElementById('fxCurrency') as HTMLSelectElement;
  while (fxCurrency.options.length) {
    fxCurrency.options.remove(0);
  }

  // Re-add them
  const currencyNames = Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'currency' })
    : undefined;
  const options = ['none', ...currencies];
  for (const currency of options) {
    let label: string;
    if (currency === 'none') {
      label = browser.i18n.getMessage('options_currency_none_label');
    } else {
      label = currencyNames
        ? `${currency} - ${currencyNames.of(currency)}`
        : currency;
    }
    fxCurrency.options.add(new Option(label, currency));
  }
  fxCurrency.value = selectedCurrency;
}

function configureCommands() {
  // Disable any controls associated with configuring browser.commands if the
  // necessary APIs are not available.
  const canConfigureCommands =
    browser.commands &&
    typeof browser.commands.update === 'function' &&
    typeof browser.commands.reset === 'function';

  const browserCommandControls =
    document.querySelectorAll('.key.command input');
  for (const control of browserCommandControls) {
    (control as HTMLInputElement).disabled = !canConfigureCommands;
  }

  const explanationBlock = document.getElementById(
    'browser-commands-alternative'
  ) as HTMLDivElement;
  explanationBlock.style.display = canConfigureCommands ? 'none' : 'revert';

  if (!canConfigureCommands) {
    if (isEdge()) {
      explanationBlock.textContent = browser.i18n.getMessage(
        'options_browser_commands_no_toggle_key_edge'
      );
    } else if (isChromium()) {
      explanationBlock.textContent = browser.i18n.getMessage(
        'options_browser_commands_no_toggle_key_chrome'
      );
    } else {
      explanationBlock.textContent = browser.i18n.getMessage(
        'options_browser_commands_no_toggle_key'
      );
    }
    return;
  }

  const getFormToggleKeyValue = (): Command => {
    const getControl = (part: string): HTMLInputElement | null => {
      return document.getElementById(
        `toggle-${part}`
      ) as HTMLInputElement | null;
    };

    const params: CommandParams = {
      alt: getControl('alt')?.checked,
      ctrl: getControl('ctrl')?.checked,
      macCtrl: getControl('macctrl')?.checked,
      shift: getControl('shift')?.checked,
      key: getControl('key')?.value || '',
    };

    return Command.fromParams(params);
  };

  const updateToggleKey = async () => {
    try {
      const shortcut = getFormToggleKeyValue();
      await browser.commands.update({
        name: '_execute_browser_action',
        shortcut: shortcut.toString(),
      });
      setToggleKeyWarningState('ok');
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
  toggleKeyTextbox.addEventListener('keydown', (evt) => {
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

  toggleKeyTextbox.addEventListener('compositionstart', () => {
    toggleKeyTextbox.value = '';
  });
  toggleKeyTextbox.addEventListener('compositionend', () => {
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

async function getConfiguredToggleKeyValue(): Promise<Command | null> {
  // Firefox for Android does not support the browser.commands API at all
  // but probably not many people want to use keyboard shortcuts on Android
  // anyway so we can just return null from here in that case.
  if (!browser.commands) {
    return null;
  }

  const commands = await browser.commands.getAll();

  // Safari (14.1.1) has a very broken implementation of
  // chrome.commands.getAll(). It returns an object but it has no properties
  // and is not iterable.
  //
  // There's not much we can do in that case so we just hard code the default
  // key since Safari also has no way of changing shortcut keys. Hopefully
  // Safari will fix chrome.commands.getAll() before or at the same time it
  // provides a way of re-assigning shortcut keys.
  if (
    typeof commands === 'object' &&
    typeof commands[Symbol.iterator] !== 'function'
  ) {
    return new Command('R', 'MacCtrl', 'Ctrl');
  }

  for (const command of commands) {
    if (command.name === '_execute_browser_action' && command.shortcut) {
      return Command.fromString(command.shortcut);
    }
  }

  return null;
}

function configureHoldToShowKeys() {
  const getHoldToShowKeysValue = (
    checkboxes: NodeListOf<HTMLInputElement>
  ): string | null => {
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

  const settings = ['holdToShowKeys', 'holdToShowImageKeys'] as const;
  for (const setting of settings) {
    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      `.${setting.toLowerCase()} input[type=checkbox][id^=show-]`
    );

    for (const checkbox of checkboxes) {
      checkbox.addEventListener('click', () => {
        config[setting] = getHoldToShowKeysValue(checkboxes);
      });
    }
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
      keyBlock.append(keyInput);
      keyBlock.append(' '); // <-- Mimick the whitespace in the template file

      keyInput.addEventListener('click', () => {
        const checkedKeys = document.querySelectorAll(
          `input[type=checkbox].key-${setting.name}:checked`
        );
        config.updateKeys({
          [setting.name]: Array.from(checkedKeys).map(
            (checkbox) => (checkbox as HTMLInputElement).dataset.key
          ),
        });
      });

      const keyLabel = document.createElement('label');
      keyLabel.setAttribute('for', `key-${setting.name}-${key}`);

      // We need to add an extra span inside in order to be able to get
      // consistent layout when using older versions of extensions.css that put
      // the checkbox in a pseudo.
      if (setting.name === 'movePopupDownOrUp') {
        const [down, up] = key.split(',', 2);

        {
          const downSpan = document.createElement('span');
          downSpan.classList.add('key-box');
          downSpan.textContent = down;
          keyLabel.append(downSpan);
        }

        {
          const orSpan = document.createElement('span');
          orSpan.classList.add('or');
          orSpan.textContent = '/';
          keyLabel.append(orSpan);
        }

        {
          const upSpan = document.createElement('span');
          upSpan.classList.add('key-box');
          upSpan.textContent = up;
          keyLabel.append(upSpan);
        }
      } else {
        const keyLabelSpan = document.createElement('span');
        keyLabelSpan.classList.add('key-box');
        keyLabelSpan.textContent = key;
        keyLabel.append(keyLabelSpan);
      }

      keyBlock.append(keyLabel);
    }

    grid.append(keyBlock);

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
        keySpan.classList.add('key-box');
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
  const mac = isMac();

  // Hide MacCtrl key if we're not on Mac
  const macCtrlInput = document.getElementById(
    'toggle-macctrl'
  ) as HTMLInputElement | null;
  const labels = macCtrlInput?.labels ? Array.from(macCtrlInput.labels) : [];
  if (macCtrlInput) {
    macCtrlInput.style.display = mac ? 'revert' : 'none';
  }
  for (const label of labels) {
    label.style.display = mac ? 'revert' : 'none';
  }

  if (!mac) {
    return;
  }

  const keyLabels = document.querySelectorAll<HTMLSpanElement>(
    '.key > label > span'
  );
  for (const label of keyLabels) {
    // Look for a special key on the label saying what it really is.
    //
    // We need to do this because we have an odd situation where the 'commands'
    // manifest.json property treats 'Ctrl' as 'Command' but in all other cases
    // where we see 'Ctrl', it should actually be 'Control'.
    //
    // So to cover this, we stick data-mac="Command" on any labels that map to
    // 'commands'.
    const labelText = label.dataset['mac'] || label.textContent;
    if (labelText === 'Command') {
      label.textContent = '⌘';
    } else if (labelText === 'Ctrl') {
      label.textContent = 'Control';
    } else if (labelText === 'Alt') {
      label.textContent = '⌥';
    }
  }
}

function configurePuckSettings() {
  const showPuckOptions = Array.from(
    document.querySelectorAll<HTMLInputElement>(
      'input[type=radio][name=showPuck]'
    )
  );
  for (const option of showPuckOptions) {
    option.addEventListener('change', (evt) => {
      const setting = (evt.target as HTMLInputElement).value as
        | 'auto'
        | 'show'
        | 'hide';
      config.showPuck = setting;
    });
  }
}

function fillInLanguages() {
  const select = document.querySelector('select#lang') as HTMLSelectElement;

  for (let [id, data] of dbLanguageMeta) {
    let label = data.name;
    if (data.hasWords && !data.hasKanji) {
      label += browser.i18n.getMessage('options_lang_words_only');
    } else if (!data.hasWords && data.hasKanji) {
      label += browser.i18n.getMessage('options_lang_kanji_only');
    }
    const option = document.createElement('option');
    option.value = id;
    option.append(label);
    select.append(option);
  }

  select.addEventListener('change', () => {
    if (!isDbLanguageId(select.value)) {
      const msg = `Got unexpected language code: ${select.value}`;
      Bugsnag.notify(new Error(msg));
      console.error(msg);
      return;
    }
    config.dictLang = select.value;
  });
}

function createKanjiReferences() {
  const container = document.getElementById(
    'kanji-reference-list'
  ) as HTMLDivElement;

  // Remove any non-static entries
  for (const child of Array.from(container.children)) {
    if (!child.classList.contains('static')) {
      child.remove();
    }
  }

  const referenceNames = getReferenceLabelsForLang(config.dictLang);
  for (const { ref, full } of referenceNames) {
    const rowDiv = document.createElement('div');
    rowDiv.classList.add('browser-style');
    rowDiv.classList.add('checkbox-row');

    const checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'checkbox');
    checkbox.setAttribute('id', `ref-${ref}`);
    checkbox.setAttribute('name', ref);
    checkbox.addEventListener('click', (evt) => {
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
  optform.showPriority.checked = config.showPriority;
  optform.showRomaji.checked = config.showRomaji;
  optform.showDefinitions.checked = !config.readingOnly;
  optform.accentDisplay.value = config.accentDisplay;
  optform.posDisplay.value = config.posDisplay;
  optform.highlightText.checked = !config.noTextHighlight;
  optform.contextMenuEnable.checked = config.contextMenuEnable;
  optform.showKanjiComponents.checked = config.showKanjiComponents;
  optform.popupStyle.value = config.popupStyle;
  optform.tabDisplay.value = config.tabDisplay;
  optform.toolbarIcon.value = config.toolbarIcon;
  optform.showPuck.value = config.showPuck;
  optform.forceGdocsHtmlMode.checked = config.forceGdocsHtmlMode;

  renderCurrencyList(config.fxCurrency, config.fxCurrencies);

  getConfiguredToggleKeyValue()
    .then((toggleCommand) => {
      const getToggleControl = (part: string): HTMLInputElement =>
        document.getElementById(`toggle-${part}`) as HTMLInputElement;
      getToggleControl('alt').checked = !!toggleCommand?.alt;
      getToggleControl('ctrl').checked = !!toggleCommand?.ctrl;
      getToggleControl('shift').checked = !!toggleCommand?.shift;
      if (getToggleControl('macctrl')) {
        getToggleControl('macctrl').checked = !!toggleCommand?.macCtrl;
      }
      getToggleControl('key').value = toggleCommand?.key || '';
    })
    .catch((e) => {
      console.error(e);
      Bugsnag.notify(e);
    });

  // Note that this setting is hidden when we detect the device does not likely
  // have a physical keyboard.
  const holdToShowSettings = ['holdToShowKeys', 'holdToShowImageKeys'] as const;
  for (const setting of holdToShowSettings) {
    const holdKeyParts: Array<string> =
      typeof config[setting] === 'string' ? config[setting]!.split('+') : [];
    const holdKeyCheckboxes = document.querySelectorAll(
      `.${setting.toLowerCase()} input[type=checkbox][id^=show-]`
    );
    for (const checkbox of holdKeyCheckboxes) {
      (checkbox as HTMLInputElement).checked = holdKeyParts.includes(
        (checkbox as HTMLInputElement).value
      );
    }
  }

  for (const [setting, keys] of Object.entries(config.keys)) {
    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      `input[type=checkbox].key-${setting}`
    );
    for (const checkbox of checkboxes) {
      checkbox.checked =
        !!checkbox.dataset.key && keys.includes(checkbox.dataset.key);
    }
  }

  const langSelect = document.querySelector('select#lang') as HTMLSelectElement;
  const langOptions = langSelect.querySelectorAll('option');
  const dictLang = config.dictLang;
  for (const option of langOptions) {
    option.selected = option.value === dictLang;
  }

  const enabledReferences = new Set(config.kanjiReferences);
  for (const ref of getReferencesForLang(config.dictLang)) {
    const checkbox = document.getElementById(`ref-${ref}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = enabledReferences.has(ref);
    }
  }
}

let browserPort: Browser.Runtime.Port | undefined;

function isDbStateUpdatedMessage(evt: unknown): evt is DbStateUpdatedMessage {
  return (
    typeof evt === 'object' &&
    typeof (evt as any).type === 'string' &&
    (evt as any).type === 'dbstateupdated'
  );
}

function updateFormFromConfig() {
  // If the language changes, the set of references we should show might also
  // change. We need to do this before calling `fillVals` since that will take
  // care of ticking the right boxes.
  createKanjiReferences();
  fillVals();
}

window.onload = async () => {
  await config.ready;
  completeForm();
  fillVals();
  config.addChangeListener(updateFormFromConfig);

  // Listen to changes to the database.
  browserPort = browser.runtime.connect(undefined, { name: 'options' });
  browserPort.onMessage.addListener((evt: unknown) => {
    if (isDbStateUpdatedMessage(evt)) {
      // For Runtime.Port.postMessage Chrome appears to serialize objects using
      // JSON serialization (not structured cloned). As a result, any Date
      // objects will be transformed into strings.
      //
      // Ideally we'd introduce a new type for these deserialized objects that
      // converts `Date` to `Date | string` but that is likely to take a full
      // day of TypeScript wrestling so instead we just manually reach into
      // this object and convert the fields known to possibly contain dates
      // into dates.
      if (typeof evt.state.updateState.lastCheck === 'string') {
        evt.state.updateState.lastCheck = new Date(
          evt.state.updateState.lastCheck
        );
      }
      if (typeof evt.state.updateError?.nextRetry === 'string') {
        evt.state.updateError.nextRetry = new Date(
          evt.state.updateError.nextRetry
        );
      }

      updateDatabaseSummary(evt);
    }
  });
};

window.onunload = () => {
  config.removeChangeListener(updateFormFromConfig);
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

  const attribution = browser.i18n.getMessage('options_data_source');
  blurb.append(
    linkify(attribution, [
      {
        keyword: 'JMdict/EDICT',
        href: 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project',
      },
      {
        keyword: 'KANJIDIC',
        href: 'https://www.edrdg.org/wiki/index.php/KANJIDIC_Project',
      },
      {
        keyword: 'JMnedict/ENAMDICT',
        href: 'https://www.edrdg.org/enamdict/enamdict_doc.html',
      },
    ])
  );

  const license = browser.i18n.getMessage('options_edrdg_license');
  const licenseKeyword = browser.i18n.getMessage(
    'options_edrdg_license_keyword'
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

  const accentAttribution = browser.i18n.getMessage(
    'options_accent_data_source'
  );
  const accentPara = document.createElement('p');
  accentPara.append(accentAttribution);
  blurb.append(accentPara);
}

function updateDatabaseStatus(evt: DbStateUpdatedMessage) {
  const { updateState } = evt.state;

  const statusElem = document.querySelector('.db-summary-status')!;
  empty(statusElem);
  statusElem.classList.remove('-error');
  statusElem.classList.remove('-warning');

  // Fill out the info part

  switch (updateState.state) {
    case 'idle':
      updateIdleStateSummary(evt, statusElem);
      break;

    case 'checking': {
      const infoDiv = document.createElement('div');
      infoDiv.classList.add('db-summary-info');
      infoDiv.append(browser.i18n.getMessage('options_checking_for_updates'));
      statusElem.append(infoDiv);
      break;
    }

    case 'downloading':
    case 'updatingdb': {
      const infoDiv = document.createElement('div');
      infoDiv.classList.add('db-summary-info');
      const progressElem = document.createElement('progress');
      progressElem.classList.add('progress');
      progressElem.max = 100;
      progressElem.value = updateState.progress * 100;
      progressElem.id = 'update-progress';
      infoDiv.append(progressElem);

      const labelElem = document.createElement('label');
      labelElem.classList.add('label');
      labelElem.htmlFor = 'update-progress';

      const labels: { [series in DataSeries]: string } = {
        kanji: 'options_kanji_data_name',
        radicals: 'options_bushu_data_name',
        names: 'options_name_data_name',
        words: 'options_words_data_name',
      };
      const dbLabel = browser.i18n.getMessage(labels[updateState.series]);

      const { major, minor, patch } = updateState.downloadVersion;
      const versionString = `${major}.${minor}.${patch}`;

      const progressAsPercent = Math.round(updateState.progress * 100);
      const key =
        updateState.state === 'downloading'
          ? 'options_downloading_data'
          : 'options_updating_data';
      labelElem.textContent = browser.i18n.getMessage(key, [
        dbLabel,
        versionString,
        String(progressAsPercent),
      ]);

      infoDiv.append(labelElem);
      statusElem.append(infoDiv);
      break;
    }
  }

  // Add the action button info if any

  const buttonDiv = document.createElement('div');
  buttonDiv.classList.add('db-summary-button');

  switch (updateState.state) {
    case 'idle': {
      // We should probably skip this when we are offline, but for now it
      // doesn't really matter.
      const updateButton = document.createElement('button');
      updateButton.classList.add('browser-style');
      updateButton.setAttribute('type', 'button');
      const isUnavailable = allDataSeries.some(
        (series) => evt.state[series].state === DataSeriesState.Unavailable
      );
      updateButton.textContent = browser.i18n.getMessage(
        updateState.state === 'idle' && !isUnavailable
          ? 'options_update_check_button_label'
          : 'options_update_retry_button_label'
      );
      updateButton.addEventListener('click', triggerDatabaseUpdate);
      buttonDiv.append(updateButton);

      if (updateState.lastCheck) {
        const lastCheckDiv = document.createElement('div');
        lastCheckDiv.classList.add('last-check');
        const lastCheckString = browser.i18n.getMessage(
          'options_last_database_check',
          formatDate(updateState.lastCheck)
        );
        lastCheckDiv.append(lastCheckString);
        buttonDiv.append(lastCheckDiv);
      }
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
      cancelButton.addEventListener('click', cancelDatabaseUpdate);
      buttonDiv.append(cancelButton);
      break;
    }
  }

  statusElem.append(buttonDiv);
}

async function updateIdleStateSummary(
  evt: DbStateUpdatedMessage,
  statusElem: Element
) {
  const { updateError } = evt.state;
  const kanjiDbState = evt.state.kanji;

  if (!!updateError && updateError.name === 'OfflineError') {
    const infoDiv = document.createElement('div');
    infoDiv.classList.add('db-summary-info');
    infoDiv.append(browser.i18n.getMessage('options_offline_explanation'));
    statusElem.classList.add('-warning');
    statusElem.append(infoDiv);
    return;
  }

  if (!!updateError && updateError.name !== 'AbortError') {
    const infoDiv = document.createElement('div');
    infoDiv.classList.add('db-summary-info');

    const messageDiv = document.createElement('div');
    let errorMessage: string | undefined;
    if (updateError.name === 'QuotaExceededError') {
      try {
        let { quota } = await navigator.storage.estimate();
        if (typeof quota !== 'undefined') {
          // For Firefox, typically origins get a maximum of 20% of the global
          // limit. When we have unlimitedStorage permission, however, we can
          // use up to the full amount of the global limit. The storage API,
          // however, still returns 20% as the quota, so multiplying by 5 will
          // give the actual quota.
          if (isFirefox()) {
            quota *= 5;
          }
          errorMessage = browser.i18n.getMessage(
            'options_db_update_quota_error',
            formatSize(quota)
          );
        }
      } catch {
        /* Ignore. This UA likely doesn't support the navigator.storage API */
      }
    }

    if (!errorMessage) {
      errorMessage = browser.i18n.getMessage(
        'options_db_update_error',
        updateError.message
      );
    }
    messageDiv.append(errorMessage);
    infoDiv.append(messageDiv);

    if (updateError.nextRetry) {
      const nextRetryDiv = document.createElement('div');
      const nextRetryString = browser.i18n.getMessage(
        'options_db_update_next_retry',
        formatDate(updateError.nextRetry)
      );
      nextRetryDiv.append(nextRetryString);
      infoDiv.append(nextRetryDiv);
    }

    statusElem.classList.add('-error');
    statusElem.append(infoDiv);

    return;
  }

  if (
    kanjiDbState.state === DataSeriesState.Initializing ||
    kanjiDbState.state === DataSeriesState.Empty
  ) {
    const infoDiv = document.createElement('div');
    infoDiv.classList.add('db-summary-info');
    infoDiv.append(browser.i18n.getMessage('options_no_database'));
    statusElem.append(infoDiv);
    return;
  }

  if (kanjiDbState.state === DataSeriesState.Unavailable) {
    const infoDiv = document.createElement('div');
    infoDiv.classList.add('db-summary-info');
    infoDiv.append(browser.i18n.getMessage('options_database_unavailable'));
    statusElem.classList.add('-error');
    statusElem.append(infoDiv);
    return;
  }

  const gridDiv = document.createElement('div');
  gridDiv.classList.add('db-summary-version-grid');

  for (const series of allMajorDataSeries) {
    const versionInfo = evt.state[series].version;
    if (!versionInfo) {
      continue;
    }

    const { major, minor, patch, lang } = versionInfo;
    const titleDiv = document.createElement('div');
    titleDiv.classList.add('db-source-title');
    const titleKeys: { [series in MajorDataSeries]: string } = {
      kanji: 'options_kanji_data_title',
      names: 'options_name_data_title',
      words: 'options_words_data_title',
    };
    const titleString = browser.i18n.getMessage(
      titleKeys[series],
      `${major}.${minor}.${patch} (${lang})`
    );
    titleDiv.append(titleString);
    gridDiv.append(titleDiv);

    const sourceDiv = document.createElement('div');
    sourceDiv.classList.add('db-source-version');

    const sourceNames: { [series in MajorDataSeries]: string } = {
      kanji: 'KANJIDIC',
      names: 'JMnedict/ENAMDICT',
      words: 'JMdict/EDICT',
    };
    const sourceName = sourceNames[series];

    const { databaseVersion, dateOfCreation } = versionInfo;

    let sourceString;
    if (databaseVersion && databaseVersion !== 'n/a') {
      sourceString = browser.i18n.getMessage(
        'options_data_series_version_and_date',
        [sourceName, databaseVersion, dateOfCreation]
      );
    } else {
      sourceString = browser.i18n.getMessage('options_data_series_date_only', [
        sourceName,
        dateOfCreation,
      ]);
    }
    sourceDiv.append(sourceString);
    gridDiv.append(sourceDiv);
  }

  statusElem.append(gridDiv);
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
    link.rel = 'noopener';
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

function formatSize(sizeInBytes: number): string {
  const kilobyte = 1024;
  const megabyte = kilobyte * 1024;
  const gigabyte = megabyte * 1024;
  const terabyte = gigabyte * 1024;

  // We don't bother localizing any of this. Anyone able to make sense of a
  // file size, can probably understand an English file size prefix.
  if (sizeInBytes >= terabyte) {
    return (sizeInBytes / terabyte).toFixed(3) + 'Tb';
  }
  if (sizeInBytes >= gigabyte) {
    return (sizeInBytes / gigabyte).toFixed(2) + 'Gb';
  }
  if (sizeInBytes >= megabyte) {
    return (sizeInBytes / megabyte).toFixed(1) + 'Mb';
  }
  if (sizeInBytes >= kilobyte) {
    return Math.round(sizeInBytes / kilobyte) + 'Kb';
  }

  return sizeInBytes + ' bytes';
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
