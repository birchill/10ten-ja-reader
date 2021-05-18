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

import { Config, getCurrentConfiguration } from './configuration';
import { DictEntryData, RcxDict, rcxDict } from './data';

class RcxMain {
  private static instance: RcxMain;

  haveNames = true;
  dictCount = 3;
  altView = 0;
  enabled = 0;
  dict?: RcxDict;
  config?: Config;

  private constructor() {}
  static create() {
    if (!RcxMain.instance) {
      RcxMain.instance = new RcxMain();
    }
    return RcxMain.instance;
  }

  loadDictionary() {
    this.dict = rcxDict;
    return this.dict.init(this.haveNames);
  }

  // The callback for `onActivated`
  // Just sends a message to the tab to enable itself if it hasn't
  // already
  onTabSelect(tabId) {
    rcxMain._onTabSelect(tabId);
  }
  _onTabSelect(tabId) {
    if (this.enabled == 1)
      chrome.tabs.sendMessage(tabId, {
        type: 'enable',
        config: this.config,
      });
  }

  savePrep(clip, entry) {
    let me;
    let text;
    let i;
    let e;

    const f = entry;
    if (!f || f.length == 0) return null;

    if (clip) {
      // save to clipboard
      me = rcxMain.config.maxClipCopyEntries;
    }

    text = '';
    for (i = 0; i < f.length; ++i) {
      e = f[i];
      if (e.kanji) {
        text += this.dict.makeText(e, 1);
      } else {
        if (me <= 0) continue;
        text += this.dict.makeText(e, me);
        me -= e.data.length;
      }
    }

    if (rcxMain.config.lineEnding == 'rn') text = text.replace(/\n/g, '\r\n');
    else if (rcxMain.config.lineEnding == 'r') text = text.replace(/\n/g, '\r');
    if (rcxMain.config.copySeparator != 'tab') {
      if (rcxMain.config.copySeparator == 'comma')
        return text.replace(/\t/g, ',');
      if (rcxMain.config.copySeparator == 'space')
        return text.replace(/\t/g, ' ');
    }

    return text;
  }

  copyToClip(tab, entry) {
    let text;

    if ((text = this.savePrep(1, entry)) != null) {
      document.oncopy = function (event) {
        event.clipboardData.setData('Text', text);
        event.preventDefault();
      };
      document.execCommand('Copy');
      document.oncopy = undefined;
      chrome.tabs.sendMessage(tab.id, {
        type: 'showPopup',
        text: 'Copied to clipboard.',
      });
    }
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
  inlineEnable(tab, mode) {
    if (!this.dict) {
      this.loadDictionary()
        .then(
          function () {
            // Send message to current tab to add listeners and create stuff
            chrome.tabs.sendMessage(tab.id, {
              type: 'enable',
              config: rcxMain.config,
            });
            this.enabled = 1;

            if (mode == 1) {
              if (rcxMain.config.minihelp)
                chrome.tabs.sendMessage(tab.id, {
                  type: 'showPopup',
                  text: rcxMain.miniHelp,
                });
              else
                chrome.tabs.sendMessage(tab.id, {
                  type: 'showPopup',
                  text: 'Rikaikun enabled!',
                });
            }
            chrome.browserAction.setBadgeBackgroundColor({
              color: [255, 0, 0, 255],
            });
            chrome.browserAction.setBadgeText({ text: 'On' });
          }.bind(this)
        )
        .catch(function (err) {
          alert('Error loading dictionary: ' + err);
        });
    }
  }

  // This function disables rikaikun in all tabs.
  inlineDisable() {
    delete this.dict;

    this.enabled = 0;
    chrome.browserAction.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
    chrome.browserAction.setBadgeText({ text: '' });

    // Send a disable message to all browsers
    chrome.windows.getAll({ populate: true }, function (windows) {
      for (let i = 0; i < windows.length; ++i) {
        const tabs = windows[i].tabs;
        for (let j = 0; j < tabs.length; ++j) {
          chrome.tabs.sendMessage(tabs[j].id, { type: 'disable' });
        }
      }
    });
  }

  inlineToggle(tab) {
    if (rcxMain.enabled) rcxMain.inlineDisable(tab, 1);
    else rcxMain.inlineEnable(tab, 1);
  }

  kanjiN = 1;
  namesN = 2;

  showMode = 0;

  nextDict() {
    this.showMode = (this.showMode + 1) % this.dictCount;
  }

  resetDict() {
    this.showMode = 0;
  }

  sameDict = '0';
  forceKanji = '1';
  defaultDict = '2';
  nextDict = '3';

  search(text, dictOption) {
    switch (dictOption) {
      case this.forceKanji:
        const e = this.dict.kanjiSearch(text.charAt(0));
        return e;
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
      if (e) break;
      this.showMode = (this.showMode + 1) % this.dictCount;
    } while (this.showMode != m);

    return e;
  }
}

const rcxMain = RcxMain.create();

// TODO(melink14): Change to top level await when ts-node process is
// easier.
(async () => {
  const config = await getCurrentConfiguration();
  rcxMain.config = config;
})();

// Update config whenever user changes options.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  // This can happen during migrations where we save the new format
  // before the config initialization has happened.
  if (rcxMain.config === undefined) return;

  Object.entries(changes).map((change) => {
    (rcxMain.config[change[0] as keyof Config] as unknown) =
      change[1]!.newValue;
  });
});

window['rcxMain'] = rcxMain;
export { rcxMain };

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
