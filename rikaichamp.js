/*

  Rikai champ
  by Brian Birtles
  https://github.com/birtles/rikaichamp

  ---

  Originally based on Rikaikun
  by Erek Speed
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
var rcxMain = {
  haveNames: true,
  dictCount: 3,
  altView: 0,
  enabled: 0,

  loadDictionary: function() {
    if (!this.dict) {
      this.dict = new Dictionary({ loadNames: this.haveNames });
    }
    return this.dict.loaded;
  },

  // The callback for onSelectionChanged
  // Just sends a message to the tab to enable itself if it hasn't
  // already
  onTabSelect: function(tabId) {
    rcxMain._onTabSelect(tabId);
  },
  _onTabSelect: function(tabId) {
    if (this.enabled == 1)
      browser.tabs.sendMessage(tabId, {
        type: 'enable',
        config: rcxMain.config,
      });
  },

  savePrep: function(clip, entry) {
    var me, mk;
    var text;
    var i;
    var f;
    var e;

    f = entry;
    if (!f || f.length == 0) return null;

    if (clip) {
      // save to clipboard
      me = rcxMain.config.maxClipCopyEntries;
    }

    if (!this.fromLB) mk = 1;

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
  },

  // Needs entirely new implementation and dependent on savePrep
  copyToClip: function(tab, entry) {
    var text;

    if ((text = this.savePrep(1, entry)) != null) {
      document.oncopy = function(event) {
        event.clipboardData.setData('Text', text);
        event.preventDefault();
      };
      document.execCommand('Copy');
      document.oncopy = undefined;
      browser.tabs.sendMessage(tab.id, {
        type: 'showPopup',
        text: 'Copied to clipboard.',
      });
    }
  },

  miniHelp:
    '<span style="font-weight:bold">Rikai champ enabled!</span><br><br>' +
    '<table cellspacing=5>' +
    '<tr><td>A</td><td>Alternate popup location</td></tr>' +
    '<tr><td>Y</td><td>Move popup location down</td></tr>' +
    '<tr><td>C</td><td>Copy to clipboard</td></tr>' +
    '<tr><td>D</td><td>Hide/show definitions</td></tr>' +
    '<tr><td>Shift/Enter&nbsp;&nbsp;</td><td>Switch dictionaries</td></tr>' +
    '<tr><td>B</td><td>Previous character</td></tr>' +
    '<tr><td>M</td><td>Next character</td></tr>' +
    '<tr><td>N</td><td>Next word</td></tr>' +
    '</table>',

  // Function which enables the inline mode of rikaichamp
  // Unlike rikaichan there is no lookup bar so this is the only enable.
  inlineEnable: function(tab, mode) {
    this.loadDictionary().then(() => {
      // Send message to current tab to add listeners and create stuff
      browser.tabs.sendMessage(tab.id, {
        type: 'enable',
        config: rcxMain.config,
      });
      this.enabled = 1;

      if (mode == 1) {
        if (rcxMain.config.minihelp == 'true') {
          browser.tabs.sendMessage(tab.id, {
            type: 'showPopup',
            text: rcxMain.miniHelp,
          });
        } else {
          browser.tabs.sendMessage(tab.id, {
            type: 'showPopup',
            text: 'Rikai champ enabled!',
          });
        }
      }
      browser.browserAction.setBadgeBackgroundColor({
        color: [255, 0, 0, 255],
      });
      browser.browserAction.setBadgeText({ text: 'On' });
    });
  },

  // This function diables
  inlineDisable: function(tab, mode) {
    // Delete dictionary object after we implement it
    delete this.dict;

    this.enabled = 0;
    browser.browserAction.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
    browser.browserAction.setBadgeText({ text: '' });

    // Send a disable message to all browsers
    var windows = browser.windows.getAll({ populate: true }, function(windows) {
      for (var i = 0; i < windows.length; ++i) {
        var tabs = windows[i].tabs;
        for (var j = 0; j < tabs.length; ++j) {
          browser.tabs.sendMessage(tabs[j].id, { type: 'disable' });
        }
      }
    });
  },

  inlineToggle: function(tab) {
    if (rcxMain.enabled) rcxMain.inlineDisable(tab, 1);
    else rcxMain.inlineEnable(tab, 1);
  },

  kanjiN: 1,
  namesN: 2,

  showMode: 0,

  nextDict: function() {
    this.showMode = (this.showMode + 1) % this.dictCount;
  },

  resetDict: function() {
    this.showMode = 0;
  },

  sameDict: '0',
  forceKanji: '1',
  defaultDict: '2',
  nextDict: '3',

  search: function(text, dictOption) {
    const kanjiReferences = new Set(
      Object.entries(rcxMain.config.kanjiinfo)
        .filter(([abbrev, setting]) => setting === 'true')
        .map(([abbrev, setting]) => abbrev)
    );
    const kanjiSearchOptions = {
      includedReferences: kanjiReferences,
      includeKanjiComponents: rcxMain.config.kanjicomponents === 'true',
    };

    switch (dictOption) {
      case this.forceKanji:
        return Promise.resolve(
          this.dict.kanjiSearch(text.charAt(0), kanjiSearchOptions)
        );

      case this.defaultDict:
        this.showMode = 0;
        break;

      case this.nextDict:
        this.showMode = (this.showMode + 1) % this.dictCount;
        break;
    }

    const searchCurrentDict = text => {
      switch (this.showMode) {
        case this.kanjiN:
          return Promise.resolve(
            this.dict.kanjiSearch(text.charAt(0), kanjiSearchOptions)
          );
        case this.namesN:
          return this.dict.wordSearch(text, true);
      }
      return this.dict.wordSearch(text, false);
    };

    const originalMode = this.showMode;
    return (function loopOverDictionaries(text, self) {
      return searchCurrentDict(text).then(result => {
        if (result) {
          return result;
        }
        self.showMode = (self.showMode + 1) % self.dictCount;
        if (self.showMode === originalMode) {
          return null;
        }
        return loopOverDictionaries(text, self);
      });
    })(text, this);
  },
};

/*
  2E80 - 2EFF CJK Radicals Supplement
  2F00 - 2FDF Kangxi Radicals
  2FF0 - 2FFF Ideographic Description
p 3000 - 303F CJK Symbols and Punctuation
x 3040 - 309F Hiragana
x 30A0 - 30FF Katakana
  3190 - 319F Kanbun
  31F0 - 31FF Katakana Phonetic Extensions
  3200 - 32FF Enclosed CJK Letters and Months
  3300 - 33FF CJK Compatibility
x 3400 - 4DBF CJK Unified Ideographs Extension A
x 4E00 - 9FFF CJK Unified Ideographs
x F900 - FAFF CJK Compatibility Ideographs
p FF00 - FFEF Halfwidth and Fullwidth Forms
x FF66 - FF9D Katakana half-width

*/
