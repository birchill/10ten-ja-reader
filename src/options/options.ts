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

  const container = document.getElementById('container')!;
  render(h(OptionsPage, { config }), container);
}

window.onload = async () => {
  await config.ready;
  completeForm();
};
