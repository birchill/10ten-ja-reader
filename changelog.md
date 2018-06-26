## 0.0.16 (not yet released)

* Hopefully fixed the issue where the extension would sometimes stop working
  ([#17](https://github.com/birtles/rikaichamp/issues/17)).

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
