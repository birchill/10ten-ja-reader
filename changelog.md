## 0.1.19 (Not yet released)

* Fixed recognition of irregular verbs いらっしゃいます and おっしゃいます
  ([#303](https://github.com/birtles/rikaichamp/issues/303))
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
* Fixed mis-recognition of くれる and くさせる
  ([#301](https://github.com/birtles/rikaichamp/issues/301))
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
* Fixed recognition of ー (長音符) after ゛゜ and ゃゅょ (e.g. じーちゃん)
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
* Added language attribute to popup window so we default to Japanese characters
  even on Chinese language pages
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
* Fixed selection range when matching years
  ([#286](https://github.com/birtles/rikaichamp/issues/286))
* Updated word and name dictionaries to 2020-06-23 snapshot

## 0.1.18 (2020-05-18)

* Ignore <kbd>Shift</kbd> when combined with other modifier keys
  ([#235](https://github.com/birtles/rikaichamp/issues/235))
* Fixed a bug in handling ー after an い sound
  ([#246](https://github.com/birtles/rikaichamp/issues/246))
  thanks to [@claudiofreitas](https://github.com/claudiofreitas)
* Fixed regression to recognizing -masu stem forms
  ([#245](https://github.com/birtles/rikaichamp/issues/245))
* Fixed recognizing decomposed forms
  ([#264](https://github.com/birtles/rikaichamp/issues/264))
* Updated word and name dictionaries to 2020-05-17 snapshot.

## 0.1.17 (2020-04-31)

* Added support for recognizing and converting Japanese era years
  昭和５６年、令和元年、平成三十一年 etc.
  ([#202](https://github.com/birtles/rikaichamp/issues/202))
* Made dictionary matching recognize ー in 頑張ろー and そーゆー etc.
  ([#174](https://github.com/birtles/rikaichamp/issues/174))
* Added matching for continous forms such as 食べている and 食べてた
  ([#73](https://github.com/birtles/rikaichamp/issues/73))
* Updated word and name dictionaries to 2020-04-12 snapshot.

## 0.1.16 (2020-01-07)

* Made dictionary matching not split up yo-on like じゃ
  ([#49](https://github.com/birtles/rikaichamp/issues/49))
* Tightened up error reporting
* Updated word and name dictionaries to 2020-01-06 snapshot.

## 0.1.15 (2019-12-23)

* Made database handling (hopefully) more robust

## 0.1.14 (2019-12-12)

* Add more robust handling of extension storage
* Make browser action warning less noisy

## 0.1.13 (2019-12-12)

* Yet more database logging

## 0.1.12 (2019-12-11)

* Avoid reporting update errors twice
* Try to make updating more robust
* Add further logging

## 0.1.11 (2019-12-10)

* Add even more logging

## 0.1.10 (2019-12-10)

* Add some more logging

## 0.1.9 (2019-12-10)

* Switch to using idb instead of dexie.
* Update word and name dictionaries to 2019-12-09 snapshot.

## 0.1.8 (2019-12-04)

* Make failed downloads resume from most recent failure.

## 0.1.7 (2019-12-03)

* Improve error handling and reporting for download errors.

## 0.1.6 (2019-11-29)

* Avoid looking up database when it is unavailable.

## 0.1.5 (2019-11-29)

* Make sure asynchronous download errors are handled correctly.

## 0.1.4 (2019-11-29)

* Better handle the case where IndexedDB is unavailable
  ([#148](https://github.com/birtles/rikaichamp/issues/148))
* Fix some cases where the content in the kanji window wraps
  ([#149](https://github.com/birtles/rikaichamp/issues/149))

## 0.1.3 (2019-11-27)

* Updated database interaction to better handle initial language setting.
* Added logging to various database interactions.

## 0.1.2 (2019-11-27)

* Made kanji dictionary always updated and not loaded into memory.
* Updated word and name dictionaries to 2019-11-25 snapshot.

## 0.0.32 (2019-07-10)

* Added support for displaying romaji (off by default)
  ([#23](https://github.com/birtles/rikaichamp/issues/23))
* Updated dictionaries to 2019-07-05 snapshot.

## 0.0.31 (2019-04-03)

* Updated dictionaries to 2019-04-02 snapshot (to include 令和).

## 0.0.30 (2019-03-12)

* Fixed looking up of entries where the reading is in Katakana
  ([#84](https://github.com/birtles/rikaichamp/issues/84))
* Reworked handling of keystrokes when a textbox is in use.
  Hopefully Rikaichamp listens to keystrokes when you expect it to and ignores
  them when you don't.
  ([#20](https://github.com/birtles/rikaichamp/issues/20))
* Updated dictionaries to 2019-03-11 snapshot.

## 0.0.29 (2019-01-27)

* Added kanji references for Conning's 'The Kodansha Kanji Learner's Course'
  thanks to [@Kala-J](https://github.com/Kala-J).
* Make the kanji view show the traditional radical (not the Nelson radical).
  The Nelson radical will be shown in the references section in cases where it
  differs.
* Kanji components are now included when copying a kanji entry to the clipboard
* Updated dictionaries to 2019-01-26 snapshot.

## 0.0.28 (2018-12-31)

* Added more user-friendly display of annotations for the names dictionary
  ([#64](https://github.com/birtles/rikaichamp/issues/64))
* Made pop-up key handling work even when CapsLock is on
  ([#72](https://github.com/birtles/rikaichamp/issues/72))
* Updated dictionaries to 2018-12-30 snapshot.

## 0.0.27 (2018-12-28)

* Fixed highlighting so it works correctly with faux-ruby as used on renshuu.org
  and Japanese learners' stack exchange
  ([#67](https://github.com/birtles/rikaichamp/issues/67))
* Fixed result trimming so that it sorts by priority before trimming
  ([#70](https://github.com/birtles/rikaichamp/issues/70))
* Updated dictionaries to 2018-12-27 snapshot.

## 0.0.26 (2018-11-09)

* Added support for copying entries to the clipboard.
  Press 'c' when the popup is displayed then follow the on-screen prompts.
  ([#50](https://github.com/birtles/rikaichamp/issues/50))
* Added Kanji kentei levels to kanji popup
* Added support for parsing ぬ verbs
  ([#56](https://github.com/birtles/rikaichamp/issues/56))
  thanks to [@ispedals](https://github.com/ispedals).
* Added deinflecting き → 来る
  ([#59](https://github.com/birtles/rikaichamp/issues/59))
  thanks to [@ispedals](https://github.com/ispedals).
* Added support for looking up various conjugated irregular verbs and
  Yodan verbs and improved lookup for regular verbs
  ([#58](https://github.com/birtles/rikaichamp/issues/58)).
* Made the 'Toggle definitions' key (<kbd>d</kbd>) be disabled by
  default ([#57](https://github.com/birtles/rikaichamp/issues/57)).
  If you use this key, you will need to re-enable it from the extension options
  page.
* Updated dictionaries to 2018-11-08 snapshot.

## 0.0.25 (2018-09-27)

* Fixed Japanese localization thanks to [@piroor](https://github.com/piroor).
* Fixed ordering of entries so that more common entries appear first
  ([#26](https://github.com/birtles/rikaichamp/issues/26)).
* Added parsing for とく・どく forms
  ([#51](https://github.com/birtles/rikaichamp/issues/51)).
* Updated dictionaries to 2018-09-26 snapshot.

## 0.0.24 (2018-08-29)

* Made the hotkey for enabling Rikaichamp configurable
  ([#30](https://github.com/birtles/rikaichamp/issues/30)).
* Introduced hold-to-display hotkey
  ([#33](https://github.com/birtles/rikaichamp/issues/33)).
* Localized UI into Japanese.
* Various tweaks to option page styling.
* Updated dictionaries to 2018-08-28 snapshot.

## 0.0.23 (2018-08-08!)

* Properly fixed pre-Firefox 57 installs.
* Tweaked timeout for file reads so it is initially shorters.
* Tweaked diagnostics for longer loads.
* Updated dictionaries to 2018-08-07 snapshot.

## 0.0.22 (2018-08-08)

* Added temporary workaround for users of Firefox <56 (but seriously, please
  upgrade your Firefox).

## 0.0.21 (2018-08-08)

* Added timeout handling to deal with file loads that seem to never end
  (particularly on Linux and on startup / upgrade).
* Made it possible to recover from load errors.

## 0.0.20 (released on 2018-08-07 but disabled moments later)

* Hopefully made loading data files more robust to reduce the likelihood of
  errors on startup.
* Made names display in two columns when necessary.
* Updated word, names, and **kanji** dictionaries to 2018-08-06 snapshot.

## 0.0.19 (2018-07-28)

* Added even more diagnostics to dictionary loading.
* Simplified dictionary loading somewhat.
* Updated word and names dictionaries to 2018-07-27 snapshot.

## 0.0.18 (2018-07-26)

* Added more diagnostics to try to narrow down the cause of Rikaichamp
  occasionally getting stuck loading
  ([#45](https://github.com/birtles/rikaichamp/issues/45)).
* Fixed handling of full-width tilde.
* Updated word and names dictionaries to 2018-07-25 snapshot.

## 0.0.17 (2018-07-14)

* Added diagnostic error reporting for failures to load the dictionary.
  Attempting to fix the issue with Rikaichamp getting stuck loading
  ([#45](https://github.com/birtles/rikaichamp/issues/45)).
* Updated word and names dictionaries to 2018-07-13 snapshot.

## 0.0.16 (2018-06-28)

* Hopefully fixed the issue where the extension would sometimes stop working
  ([#17](https://github.com/birtles/rikaichamp/issues/17)).
* Updated word and names dictionaries to 2018-06-27 snapshot.

## 0.0.15 (2018-06-22)

* Made the extension continue to work when the timer precision is reduced
  ([#35](https://github.com/birtles/rikaichamp/issues/35)).
* Updated word and names dictionaries to 2018-06-21 snapshot.

## 0.0.14 (2018-06-01)

* Improved ruby handling: Fixed text selection when `<rb>` elements are used
  ([#37](https://github.com/birtles/rikaichamp/issues/37)).
* Improved grammar reporting:
  * Fixed the reported inflection of passive godan verbs
    ([#36](https://github.com/birtles/rikaichamp/issues/36)).
  * Added support for reporting causative passives.
  * Fixed deinflection of させる for verbs ending in す (e.g.
    起こさせる→起こす).
* Stability: Fixed one case where the rikaichamp popup might get stuck.
* Minor tweak to options page.
* Improved bundling of scripts using webpack.
* Updated word and names dictionaries to 2018-05-31 snapshot.

## 0.0.13 (2018-01-28)

* (Hopefully) fixed text box handling, especially scroll restoration.
* Made pop-up not show up when the mouse if far from the target word.
* Updated word and names dictionaries to 2018-01-28 snapshot.

## 0.0.12 (2017-12-20)

* Add popup style selection to settings panel (thanks to [@kikaxa](https://github.com/kikaxa)).
* Fixed a bug where the popup would not appear correctly when dealing with pages
  with mismatched encodings.
* Disabled the popup while selecting text.
* Updated word and names dictionaries to 2017-12-19 snapshot.

## 0.0.11 (2017-11-23)

* Fixed hidden popup from interfering with page contents.
* Make popup now show when the mouse is moving at high speed.
* Possibly improved popup fadeout performance.
* Make rikaichamp a little more thorough about cleaning up after itself.
* Updated word dictionary to 2017-11-22 snapshot.

## 0.0.10 (2017-11-19)

* Made the extension remember if it was enabled across browser restarts (this
  time for sure).
* Added a description of the Alt+R shortcut key to the options page.

## 0.0.9 (2017-11-18)

* Added "Enable Rikaichamp" to the context menu (can be disabled from the
  options).
* Added Alt+R as a shortcut key for enabling/disabling Rikaichamp.
* ~~Made the extension remember if it was enabled across browser restarts
  (hopefully).~~ (It turns out this didn't work)
* Updated word dictionary to 2017-11-17 snapshot.

## 0.0.8 (2017-11-13)

* Added option to disable text highlighting (thanks to [@nanaya](https://github.com/nanaya)).
* Added option to disable individual keyboard shortcuts.
* Dropped ability to adjust vertical position of pop-up using j/k. Please let me
  know if you used this feature and I'll add it back!
* Updated word dictionary to 2017-11-12 snapshot.

## 0.0.7 (2017-11-06)

* Fixed incorrect positioning of pop-up on initial display.
* Updated word dictionary to 2017-11-05 snapshot.

## 0.0.6 (2017-10-30)

* Improved text box selection handling including ignoring key strokes when
  a text box is selected.
* Improved options synchronization.

## 0.0.5 (2017-10-24)

* Fixed a bug where keyboard events would get ignored while the pop-up was
  showing.

## 0.0.4 (2017-10-20)

* Initial version (yes, it took me four attempts to publish).
