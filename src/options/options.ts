/// <reference path="../common/constants.d.ts" />
import { h, render } from 'preact';
import browser from 'webextension-polyfill';

import { Config } from '../common/config';
import {
  AccentDisplay,
  FontSize,
  PartOfSpeechDisplay,
  TabDisplay,
} from '../common/content-config-params';
import { renderStar } from '../content/popup/icons';
import { startBugsnag } from '../utils/bugsnag';
import { html } from '../utils/builder';
import { isTouchDevice } from '../utils/device';
import { empty } from '../utils/dom-utils';
import {
  isChromium,
  isEdge,
  isFenix,
  isFirefox,
  isSafari,
} from '../utils/ua-utils';
import { getThemeClass } from '../utils/themes';

import { translateDoc } from './l10n';
import { OptionsPage } from './OptionsPage';

import './options.css';

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
  if (isTouchDevice()) {
    document.documentElement.classList.add('has-touch');
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

  // l10n
  translateDoc();

  // Auto-expire new badges
  expireNewBadges();

  document
    .getElementById('highlightText')!
    .addEventListener('click', (event) => {
      config.noTextHighlight = !(event.target as HTMLInputElement).checked;
    });

  const highlightStyleOptions = Array.from(
    document.querySelectorAll('input[type=radio][name=highlightStyle]')
  );
  for (const option of highlightStyleOptions) {
    option.addEventListener('change', (event) => {
      const highlightStyle = (event.target as HTMLInputElement).value as
        | 'none'
        | 'yellow'
        | 'blue';
      if (highlightStyle === 'none') {
        config.noTextHighlight = true;
      } else {
        config.highlightStyle = highlightStyle;
        config.noTextHighlight = false;
      }
    });

    const container = document.getElementById('container')!;
    render(h(OptionsPage, { config }), container);
  }

  document
    .getElementById('contextMenuEnable')!
    .addEventListener('click', (event) => {
      config.contextMenuEnable = (event.target as HTMLInputElement).checked;
    });

  const toolbarIconOptions = Array.from(
    document.querySelectorAll('input[type=radio][name=toolbarIcon]')
  );
  for (const option of toolbarIconOptions) {
    option.addEventListener('change', (event) => {
      const toolbarIcon = (event.target as HTMLInputElement).value as
        | 'default'
        | 'sky';
      config.toolbarIcon = toolbarIcon;
    });
  }

  document
    .getElementById('showPriority')!
    .addEventListener('click', (event) => {
      config.showPriority = (event.target as HTMLInputElement).checked;
      renderPopupStyleSelect();
    });

  document
    .getElementById('showWaniKaniLevel')!
    .addEventListener('click', (event) => {
      config.waniKaniVocabDisplay = (event.target as HTMLInputElement).checked
        ? 'show-matches'
        : 'hide';
      renderPopupStyleSelect();
    });

  document.getElementById('showRomaji')!.addEventListener('click', (event) => {
    config.showRomaji = (event.target as HTMLInputElement).checked;
    renderPopupStyleSelect();
  });

  document
    .getElementById('showDefinitions')!
    .addEventListener('click', (event) => {
      config.readingOnly = !(event.target as HTMLInputElement).checked;
      renderPopupStyleSelect();
    });

  document
    .getElementById('accentDisplay')!
    .addEventListener('input', (event) => {
      config.accentDisplay = (event.target as HTMLSelectElement)
        .value as AccentDisplay;
      renderPopupStyleSelect();
    });

  document.getElementById('posDisplay')!.addEventListener('input', (event) => {
    config.posDisplay = (event.target as HTMLSelectElement)
      .value as PartOfSpeechDisplay;
    renderPopupStyleSelect();
  });

  document.getElementById('fontSize')!.addEventListener('input', (event) => {
    config.fontSize = (event.target as HTMLSelectElement).value as FontSize;
    renderPopupStyleSelect();
  });

  document.getElementById('expandWords')!.addEventListener('click', (event) => {
    config.toggleAutoExpand(
      'words',
      (event.target as HTMLInputElement).checked
    );
  });
  document.getElementById('expandKanji')!.addEventListener('click', (event) => {
    config.toggleAutoExpand(
      'kanji',
      (event.target as HTMLInputElement).checked
    );
  });

  const mouseInteractivityOptions = Array.from(
    document.querySelectorAll('input[type=radio][name=mouseInteractivity]')
  );
  for (const option of mouseInteractivityOptions) {
    option.addEventListener('change', (event) => {
      const popupInteractive = (event.target as HTMLInputElement).value;
      config.popupInteractive = popupInteractive === 'enable';
    });
  }

  document
    .getElementById('enableTapLookup')!
    .addEventListener('click', (event) => {
      config.enableTapLookup = (event.target as HTMLInputElement).checked;
    });

  const tabDisplayOptions = Array.from(
    document.querySelectorAll('input[type=radio][name=tabDisplay]')
  );
  for (const option of tabDisplayOptions) {
    option.addEventListener('change', (event) => {
      const tabDisplay = (event.target as HTMLInputElement).value as TabDisplay;
      config.tabDisplay = tabDisplay;
    });
  }

  document.getElementById('fxCurrency')!.addEventListener('input', (event) => {
    config.fxCurrency = (event.target as HTMLSelectElement).value;
  });
}

function renderPopupStyleSelect() {
  const popupStyleSelect = document.getElementById('popupstyle-select')!;
  empty(popupStyleSelect);
  const themes = ['default', 'light', 'blue', 'lightblue', 'black', 'yellow'];

  for (const theme of themes) {
    const input = html('input', {
      type: 'radio',
      name: 'popupStyle',
      value: theme,
      id: `popupstyle-${theme}`,
    });
    popupStyleSelect.appendChild(input);

    input.addEventListener('click', () => {
      config.popupStyle = theme;
      setTabDisplayTheme(theme);
    });

    const label = html('label', { for: `popupstyle-${theme}` });
    popupStyleSelect.appendChild(label);

    // The default theme alternates between light and dark so we need to
    // generate two popup previews and overlay them.
    if (theme === 'default') {
      label.appendChild(
        html(
          'div',
          { class: 'overlay' },
          renderPopupPreview('light'),
          renderPopupPreview('black')
        )
      );
    } else {
      label.appendChild(renderPopupPreview(theme));
    }
  }
}

function renderPopupPreview(theme: string): HTMLElement {
  const popupPreview = html('div', {
    class: `popup-preview window theme-${theme}`,
  });
  if (config.fontSize !== 'normal') {
    popupPreview.classList.add(`font-${config.fontSize}`);
  }

  const entry = html('div', { class: 'entry' });
  popupPreview.appendChild(entry);

  const headingDiv = html('div', {});
  entry.append(headingDiv);

  const spanKanji = html('span', { class: 'w-kanji' }, '理解');
  if (config.showPriority) {
    spanKanji.append(renderStar('full'));
  }
  if (config.waniKaniVocabDisplay === 'show-matches') {
    spanKanji.appendChild(html('span', { class: 'wk-level' }, '21'));
  }
  headingDiv.appendChild(spanKanji);

  const spanKana = html('span', { class: 'w-kana' });

  switch (config.accentDisplay) {
    case 'downstep':
      spanKana.textContent = 'りꜜかい';
      break;

    case 'binary':
    case 'binary-hi-contrast':
      {
        spanKana.append(
          html(
            'span',
            {
              class: `w-binary${
                config.accentDisplay === 'binary-hi-contrast'
                  ? ' -hi-contrast'
                  : ''
              }`,
            },
            html('span', { class: 'h-l' }, 'り'),
            html('span', { class: 'l' }, 'かい')
          )
        );
      }
      break;

    case 'none':
      spanKana.textContent = 'りかい';
      break;
  }

  if (config.showPriority) {
    spanKana.append(renderStar('full'));
  }
  headingDiv.appendChild(spanKana);

  if (config.showRomaji) {
    headingDiv.appendChild(html('span', { class: 'w-romaji' }, 'rikai'));
  }

  if (!config.readingOnly) {
    const spanDef = html('span', { class: 'w-def' });

    if (config.posDisplay !== 'none') {
      const posSpan = html('span', { class: 'w-pos tag' });
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

    spanDef.append('\u200bunderstanding');

    entry.appendChild(spanDef);
  }

  return popupPreview;
}

function setTabDisplayTheme(theme: string) {
  const tabIcons = Array.from(
    document.querySelectorAll(
      '.interactivity-select .icon .svg, .tabdisplay-select .icon .svg'
    )
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

// Expire current set of badges on Oct 10
const NEW_EXPIRY = new Date(2023, 9, 10);

function expireNewBadges() {
  if (new Date() < NEW_EXPIRY) {
    return;
  }

  const badges = document.querySelectorAll('.new-badge');
  for (const badge of badges) {
    if (badge instanceof HTMLElement) {
      badge.style.display = 'none';
    }
  }
}

function fillVals() {
  const optform = document.getElementById('optform') as HTMLFormElement;
  optform.highlightStyle.value = config.noTextHighlight
    ? 'none'
    : config.highlightStyle;
  optform.showPriority.checked = config.showPriority;
  optform.showWaniKaniLevel.checked =
    config.waniKaniVocabDisplay === 'show-matches';
  optform.showRomaji.checked = config.showRomaji;
  optform.showDefinitions.checked = !config.readingOnly;
  optform.accentDisplay.value = config.accentDisplay;
  optform.posDisplay.value = config.posDisplay;
  optform.fontSize.value = config.fontSize;
  const { autoExpand } = config;
  optform.expandWords.checked = autoExpand.includes('words');
  optform.expandKanji.checked = autoExpand.includes('kanji');
  optform.highlightText.checked = !config.noTextHighlight;
  optform.contextMenuEnable.checked = config.contextMenuEnable;
  optform.mouseInteractivity.value = config.popupInteractive
    ? 'enable'
    : 'disable';
  optform.popupStyle.value = config.popupStyle;
  optform.enableTapLookup.checked = config.enableTapLookup;
  optform.tabDisplay.value = config.tabDisplay;
  optform.toolbarIcon.value = config.toolbarIcon;

  renderCurrencyList(config.fxCurrency, config.fxCurrencies);
}

window.onload = async () => {
  try {
    await config.ready;
    completeForm();
    fillVals();
  } finally {
    // Reveal contents now that it is complete
    document.documentElement.classList.add('initialized');
  }

  config.addChangeListener(fillVals);
};

window.onunload = () => {
  config.removeChangeListener(fillVals);
};
