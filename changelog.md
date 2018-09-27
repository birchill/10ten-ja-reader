## 0.0.26 (not yet released)

(Nothing yet)

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
