/// <reference path="../common/constants.d.ts" />
import { h, render } from 'preact';

import { Config } from '../common/config';
import { startBugsnag } from '../utils/bugsnag';
import {
  isChromium,
  isEdge,
  isFenix,
  isFirefox,
  isSafari,
} from '../utils/ua-utils';

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

  // l10n
  translateDoc();

  // Auto-expire new badges
  expireNewBadges();

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

  const container = document.getElementById('container')!;
  render(h(OptionsPage, { config }), container);
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
  optform.toolbarIcon.value = config.toolbarIcon;
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
