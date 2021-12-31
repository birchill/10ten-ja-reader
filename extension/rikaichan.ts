/*

  Rikaikun
  Copyright (C) 2010 Erek Speed
  http://code.google.com/p/rikaikun/

  ---

  Originally based on Rikaichan 1.07
  by Jonathan Zarate
  http://www.polarcloud.com/

  ---

  Originally based on RikaiXUL 0.4 by Todd Rudick
  http://www.rikai.com/
  http://rikaixul.mozdev.org/

  ---

  This program is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation; either version 2 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

  ---

  Please do not change or remove any of the copyrights or links to web pages
  when modifying any of the files. - Jon

*/

import { Config } from './configuration';
import { DictEntryData, RcxDict } from './data';

class RcxMain {
  private static instance: RcxMain;

  haveNames = true;
  dictCount = 3;
  altView = 0;
  enabled = 0;
  dict: RcxDict;
  config: Config;

  private constructor(dict: RcxDict, config: Config) {
    this.dict = dict;
    this.config = config;
  }
  static create(dict: RcxDict, config: Config) {
    if (!RcxMain.instance) {
      RcxMain.instance = new RcxMain(dict, config);
    }
    return RcxMain.instance;
  }

  // The callback for `onActivated`
  // Just sends a message to the tab to enable itself if it hasn't
  // already
  onTabSelect(tabId: number | undefined) {
    if (tabId === undefined) {
      return;
    }
    this._onTabSelect(tabId);
  }
  _onTabSelect(tabId: number) {
    if (this.enabled === 1) {
      chrome.tabs.sendMessage(tabId, {
        type: 'enable',
        config: this.config,
      });
    }
  }

  // TODO(melink14): This is only called by `copyToClip`; investigate.
  savePrep(forClipping: boolean, entries: DictEntryData[]) {
    let maxEntries = this.config.maxDictEntries;
    let text;
    let i;
    let e;

    const f = entries;
    if (!f || f.length === 0) {
      return null;
    }

    if (forClipping) {
      // save to clipboard
      maxEntries = this.config.maxClipCopyEntries;
    }

    text = '';
    for (i = 0; i < f.length; ++i) {
      e = f[i];
      if (e.kanji) {
        text += this.dict.makeText(e, 1);
      } else {
        if (maxEntries <= 0) {
          continue;
        }
        text += this.dict.makeText(e, maxEntries);
        maxEntries -= e.data.length;
      }
    }

    if (this.config.lineEnding === 'rn') {
      text = text.replace(/\n/g, '\r\n');
    } else if (this.config.lineEnding === 'r') {
      text = text.replace(/\n/g, '\r');
    }
    if (this.config.copySeparator !== 'tab') {
      if (this.config.copySeparator === 'comma') {
        return text.replace(/\t/g, ',');
      }
      if (this.config.copySeparator === 'space') {
        return text.replace(/\t/g, ' ');
      }
    }

    return text;
  }

  copyToClip(tab: chrome.tabs.Tab | undefined, entries: DictEntryData[]) {
    if (tab?.id === undefined) {
      return;
    }
    const text = this.savePrep(true, entries);
    if (text === null) {
      return;
    }

    const copyFunction = function (event: ClipboardEvent) {
      // TODO(https://github.com/w3c/clipboard-apis/issues/64): Remove `!` when spec is fixed
      // and typescript types are updated.
      event.clipboardData!.setData('Text', text);
      event.preventDefault();
    };
    document.addEventListener('copy', copyFunction);
    document.execCommand('Copy');
    document.removeEventListener('copy', copyFunction);
    chrome.tabs.sendMessage(tab.id, {
      type: 'showPopup',
      text: 'Copied to clipboard.',
    });
  }

  miniHelp =
    '<span style="font-weight:bold">Rikaikun enabled!</span><br><br>' +
    '<table cellspacing=5>' +
    '<tr><td>A</td><td>Alternate popup location</td></tr>' +
    '<tr><td>Y</td><td>Move popup location down</td></tr>' +
    '<tr><td>C</td><td>Copy to clipboard</td></tr>' +
    '<tr><td>D</td><td>Hide/show definitions</td></tr>' +
    '<tr><td>Shift/Enter&nbsp;&nbsp;</td><td>Switch dictionaries</td></tr>' +
    '<tr><td>B</td><td>Previous character</td></tr>' +
    '<tr><td>M</td><td>Next character</td></tr>' +
    '<tr><td>N</td><td>Next word</td></tr>' +
    '<tr><td>J</td><td>Scroll back definitions</td></tr>' +
    '<tr><td>K</td><td>Scroll forward definitions</td></tr>' +
    '</table>';

  // Function which enables the inline mode of rikaikun
  // Unlike rikaichan there is no lookup bar so this is the only enable.
  inlineEnable(tabId: number, mode: number) {
    // Send message to current tab to add listeners and create stuff
    chrome.tabs.sendMessage(tabId, {
      type: 'enable',
      config: this.config,
    });
    this.enabled = 1;

    if (mode === 1) {
      if (this.config.minihelp) {
        chrome.tabs.sendMessage(tabId, {
          type: 'showPopup',
          text: this.miniHelp,
        });
      } else {
        chrome.tabs.sendMessage(tabId, {
          type: 'showPopup',
          text: 'Rikaikun enabled!',
        });
      }
    }
    void chrome.browserAction.setBadgeBackgroundColor({
      color: [255, 0, 0, 255],
    });
    void chrome.browserAction.setBadgeText({ text: 'On' });
  }

  // This function disables rikaikun in all tabs.
  inlineDisable() {
    this.enabled = 0;
    void chrome.browserAction.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
    void chrome.browserAction.setBadgeText({ text: '' });

    // Send a disable message to all browsers
    chrome.windows.getAll({ populate: true }, (windows) => {
      for (let i = 0; i < windows.length; ++i) {
        const tabs = windows[i].tabs;
        if (tabs === undefined) {
          continue;
        }
        for (let j = 0; j < tabs.length; ++j) {
          if (tabs[j].id === undefined) {
            continue;
          }
          chrome.tabs.sendMessage(tabs[j].id!, { type: 'disable' });
        }
      }
    });
  }

  inlineToggle(tab: chrome.tabs.Tab) {
    if (tab?.id === undefined) {
      return;
    }
    if (this.enabled) {
      this.inlineDisable();
    } else {
      this.inlineEnable(tab.id, 1);
    }
  }

  kanjiN = 1;
  namesN = 2;

  showMode = 0;

  resetDict() {
    this.showMode = 0;
  }

  sameDict = '0';
  forceKanji = '1';
  defaultDict = '2';
  nextDict = '3';

  search(text: string, dictOption: string) {
    switch (dictOption) {
      case this.forceKanji:
        return this.dict.kanjiSearch(text.charAt(0));
      case this.defaultDict:
        this.showMode = 0;
        break;
      case this.nextDict:
        this.showMode = (this.showMode + 1) % this.dictCount;
        break;
    }

    const m = this.showMode;
    let e: DictEntryData | null = null;

    do {
      switch (this.showMode) {
        case 0:
          e = this.dict.wordSearch(text, false);
          break;
        case this.kanjiN:
          e = this.dict.kanjiSearch(text.charAt(0));
          break;
        case this.namesN:
          e = this.dict.wordSearch(text, true);
          break;
      }
      if (e) {
        break;
      }
      this.showMode = (this.showMode + 1) % this.dictCount;
    } while (this.showMode !== m);

    return e;
  }
}

export { RcxMain };

/*
  Useful Japanese unicode ranges but melink14 doesn't know
  what p and x mean.
  2E80 - 2EFF  CJK Radicals Supplement
  2F00 - 2FDF  Kangxi Radicals
  2FF0 - 2FFF  Ideographic Description
p  3000 - 303F CJK Symbols and Punctuation
x  3040 - 309F Hiragana
x  30A0 - 30FF Katakana
  3190 - 319F  Kanbun
  31F0 - 31FF Katakana Phonetic Extensions
  3200 - 32FF Enclosed CJK Letters and Months
  3300 - 33FF CJK Compatibility
x  3400 - 4DBF  CJK Unified Ideographs Extension A
x  4E00 - 9FFF  CJK Unified Ideographs
x  F900 - FAFF  CJK Compatibility Ideographs
p  FF00 - FFEF Halfwidth and Fullwidth Forms
x  FF66 - FF9D  Katakana half-width

*/
