# Changelog

All notable changes to this project will be documented in this file.

The format is based roughly on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project does _not_ adhere to semantic versioning—it's a consumer
app.

## [Unreleased]

## [1.23.0] - 2025-01-23

- Added precise conversion of Japanese era dates, including those preceding
  the adoption of the Gregorian calendar in Japan, with accurate calculations
  for the timespan of specific years and months
  (e.g. 元治元年, 慶応4年閏4月, 明治5年12月2日)
  ([#2093](https://github.com/birchill/10ten-ja-reader/pull/2093)).
- Fixed sorting of word results
  (see [#1966](https://github.com/birchill/10ten-ja-reader/issues/1966#issuecomment-2426690974)).
- (Chrome) Fixed language code for Chinese localization
  ([#2051](https://github.com/birchill/10ten-ja-reader/issues/2051)).
- Added deinflection for -得る
  ([#2060](https://github.com/birchill/10ten-ja-reader/pull/2060)).
- Made the kanji references table more responsive
  thanks to [@StarScape](https://github.com/StarScape)
  ([#2115](https://github.com/birchill/10ten-ja-reader/pull/2115)).
- Fixed displaying metadata in the names tab
  ([#2129](https://github.com/birchill/10ten-ja-reader/pull/2129)).
- Added support for characters in the
  [Enclosed Ideographic Supplement block](https://ja.wiktionary.org/wiki/%E3%82%AB%E3%83%86%E3%82%B4%E3%83%AA:Unicode_Enclosed_Ideographic_Supplement)
  (e.g. 🈀, 🈁, 🈴)
  ([#2192](https://github.com/birchill/10ten-ja-reader/pull/2192)).

## [1.22.0] - 2024-10-17

- (Safari) added workaround for [Safari storage API
  regression](https://bugs.webkit.org/show_bug.cgi?id=281644)
  ([#2045](https://github.com/birchill/10ten-ja-reader/issues/2045)).
- Added support for irregular verb forms of 揺蕩う
  ([#1962](https://github.com/birchill/10ten-ja-reader/issues/1962)).
- Made tap detection more reliable
  thanks to [@maiself](https://github.com/maiself)
  ([#2014](https://github.com/birchill/10ten-ja-reader/pull/2014)).
- Added handling for metric suffixes on currencies (e.g. 40k円) as well as
  "yen" suffixes (e.g. 200k yen) and "JPY" prefixes (e.g. JPY 1,000)
  ([#2000](https://github.com/birchill/10ten-ja-reader/pull/2000)).
- Added handling for 戶 and 內 kyūjitai.
- Added deinflection for additional forms of -sugiru
  ([#2033](https://github.com/birchill/10ten-ja-reader/pull/2033)).
- Added deinflection for irregular forms of `vs-s` and `vz` class suru verbs
  ([#2038](https://github.com/birchill/10ten-ja-reader/pull/2038)).
- Removed deinflection of `vs-c` class verbs, as they are not used in modern
  Japanese.
- Fixed unreasonable matches caused by duplicates in the deinflection reason chain
  ([#1966](https://github.com/birchill/10ten-ja-reader/issues/1966)).
- Fixed sorting of deinflected results in some cases (e.g. 見とれる).
- Fixed sorting when looking up kana in some cases (e.g. なる).

## [1.21.1] - 2024-09-14

- (Chrome,Edge) Fixed a bug in stroke animation
- (Safari) Fixed data location

## [1.21.0] - 2024-09-12

- **Added stroke animations to the kanji tab**
  ([#69](https://github.com/birchill/10ten-ja-reader/issues/69))!
- Fixed handling of shadow DOM content in Chrome 128+ and Firefox Nightly.
- Fixed matching of 0年
  ([#1912](https://github.com/birchill/10ten-ja-reader/pull/1912)).

## [1.20.0] - 2024-07-25

- Extended the support for honorific speech
  thanks to [@Enellis](https://github.com/Enellis)
  ([#1822](https://github.com/birchill/10ten-ja-reader/pull/1822)).
  - Added imperative for くださる
  - Added addtional forms of ます
    - たら・たり and て-form
    - Imperative
  - Added respectful speech
    - Continuous form (ていらっしゃる, てらっしゃる)
    - なさる
    - になる
  - Added humble speech
    - Continuous form (ておる, とる)
    - 致す
  - Fixed recognition of irregular verb forms of 宣う
- Added support for irregular verb forms of 給う
  thanks to [@Enellis](https://github.com/Enellis)
  ([#1470](https://github.com/birchill/10ten-ja-reader/issues/1470)).
- Fixed recognition of continuous forms of verbs with irregular te form
  thanks to [@Enellis](https://github.com/Enellis)
  ([#1811](https://github.com/birchill/10ten-ja-reader/pull/1811)).
- Added supported for doing unit conversions to imperial units
  thanks to [@StarScape](https://github.com/StarScape)
  ([#1836](https://github.com/birchill/10ten-ja-reader/pull/1836))
- Added links from WaniKani annotations in the words and kanji tabs to the
  corresponding page on the WaniKani homepage
  ([#1876](https://github.com/birchill/10ten-ja-reader/pull/1876)).
- Fixed a condition that could cause some preferences to be overwritten causing,
  for example, the puck to suddenly disappear.
- Fixed duplicate matching of names with both 新字体 and 旧字体
  ([#1830](https://github.com/birchill/10ten-ja-reader/issues/1830)).
- Fixed display of matches on search-only forms so they don't appear as part of
  the entry
  ([#1547](https://github.com/birchill/10ten-ja-reader/issues/1547)).

## [1.19.1] - 2024-06-08

- Added an option to use system fonts instead of bundled fonts
  ([#1799](https://github.com/birchill/10ten-ja-reader/issues/1799)).
- (Safari) Fixed an issue with the popup stalling when looking up words using
  the puck
  ([#1802](https://github.com/birchill/10ten-ja-reader/issues/1802)).
- Fixed verb class tags being shown on proverbs
  thanks to [@Enellis](https://github.com/Enellis)
  ([#1469](https://github.com/birchill/10ten-ja-reader/issues/1469)).
- Fixed kanji incorrectly encoded as radicals not being displayed in kanji tab
  thanks to [@Enellis](https://github.com/Enellis)
  ([#1205](https://github.com/birchill/10ten-ja-reader/issues/1205#issuecomment-1783641017)).

## [1.19.0] - 2024-05-30

- Made it possible to change tabs in the popup by swiping horizontally
  thanks to [@StarScape](https://github.com/StarScape)
  ([#1656](https://github.com/birchill/10ten-ja-reader/issues/1656)).
- Bundled fonts used by the popup to provide consistent display and avoid issues
  with sites that patch system fonts
  ([#1560](https://github.com/birchill/10ten-ja-reader/issues/1560)).
- Changed puck behavior to no longer hold the popup window like a regular
  mouse event would
  thanks to [@StarScape](https://github.com/StarScape)
  ([#1767](https://github.com/birchill/10ten-ja-reader/discussions/1767)).
- Made copying to the clipboard include rare headwords again when not using
  simplified copy mode
  ([#1665](https://github.com/birchill/10ten-ja-reader/issues/1665)).
- Made the popup no longer show when tapping on text boxes and other interactive
  elements
  thanks to [@StarScape](https://github.com/StarScape)
  ([#1678](https://github.com/birchill/10ten-ja-reader/issues/1678)).
- When searching using just kana (e.g. し and ヤク), made kana matches be
  prioritized
  ([#1610](https://github.com/birchill/10ten-ja-reader/issues/1610)
  [#1657](https://github.com/birchill/10ten-ja-reader/issues/1657)).
- Fixed sorting between various deinflected results so that 進む appears before
  進ぶ when looking up 進んでいます
  ([#1722](https://github.com/birchill/10ten-ja-reader/issues/1722)).
- Made the popup update after the database update is complete
  ([#1677](https://github.com/birchill/10ten-ja-reader/issues/1677)).
- Made senses no longer be restricted when matching on search-only headwords
  ([#1551](https://github.com/birchill/10ten-ja-reader/issues/1551)).
- Fixed translation of odd numbers with digits and multiple powers of ten like
  11,786百万円
  ([#1399](https://github.com/birchill/10ten-ja-reader/issues/1399)).

## [1.18.0] - 2024-02-26

- Made the puck persist its position, orientation, and active state between
  pages
  ([#1561](https://github.com/birchill/10ten-ja-reader/issues/1561)).
- Updated the clipboard copy feature:
  - Added a new setting to copy a simplified version of the entry that may be
    more suitable for making flashcards etc.
    ([#1305](https://github.com/birchill/10ten-ja-reader/issues/1305)).
  - Definitions are now separated by line breaks.
  - Rare headwords are excluded from the result unless we matched on them.
- Fixed a case of 10ten not looking up text with ruby correctly in Ttsu reader
  ([#1313](https://github.com/birchill/10ten-ja-reader/issues/1313)).
- Stopped popup being inverted when Wikipedia's experimental dark mode is
  enabled
  ([#1590](https://github.com/birchill/10ten-ja-reader/issues/1590)).

## [1.17.1] - 2024-01-04

- (Chrome, Edge) Fixed support for Google Docs on chromium browsers
  ([#1529](https://github.com/birchill/10ten-ja-reader/issues/1529)).
- (Safari) Fixed a case where the browser tab would hang when looking up
  text in a text field.
- Improved rendering of source language information
  ([#1468](https://github.com/birchill/10ten-ja-reader/issues/1468)).
- Added localization and handling for new `rk` (rarely-used kana form) tag.

## [1.17.0] - 2023-12-06

- Added option to show Bunpro vocabulary and grammar labels next to words
  ([#1383](https://github.com/birchill/10ten-ja-reader/issues/1383)).
- Added localizations for newly-introduced field tags.
- Fixed a bug where it would take two clicks to enable the add-on sometimes
  ([#1491](https://github.com/birchill/10ten-ja-reader/issues/1491)).
- Fixed slow lookup for long text spans
  ([#1423](https://github.com/birchill/10ten-ja-reader/issues/1423)).
- Fixed options page becoming disconnected from the background page (again).

## [1.16.2] - 2023-11-28

- (Chrome, Edge) Fixed online handling in currency fetching when running as a
  service worker.
- Made options page more robust with regards to reconnecting to the background
  page (mostly only affects Safari).
- (Safari) Handle `contextMenus` not being defined on iOS.
- (Thunderbird) Made workaround for
  [Gecko bug 1860486](https://bugzilla.mozilla.org/show_bug.cgi?id=1860486)
  apply to Thunderbird too.

## [1.16.1] - 2023-11-27

- (Chrome, Edge) Removed `"scripting"` from list of permissions.

## [1.16.0] - 2023-11-27

- (Chrome, Edge) Enabled Manifest Version 3.
- (Firefox, Thunderbird) Enabled non-persistent event pages.
- (Chrome, Edge) Made the options page show up in a new tab.
- (Safari) Fixed some bugs with the background page waking up.
- Lookup fixes
  - Fixed recognition of words that end in half-width numerals like 小1.
  - Added parsing for ill-formed numbers like 39,800万円.
  - (Firefox) Fixed lookup misbehaving on Firefox with `<textarea>`s with
    `display: block` such as on pastebin.com
    ([#1403](https://github.com/birchill/10ten-ja-reader/issues/1403)).
  - Made matches on search-only headwords show the search-only version too
    (e.g. 磨ガラス, ペイチン)
    ([#1361](https://github.com/birchill/10ten-ja-reader/issues/1361)).
  - Hid the "usually kana" annotation when no kanji headwords are shown
    (also [#1361](https://github.com/birchill/10ten-ja-reader/issues/1361)).
  - Added ability to recognize (deinflect) a few more irregular verbs like
    ございません and くださいます
    ([#1431](https://github.com/birchill/10ten-ja-reader/issues/1431)).
- Keyboard fixes
  - Added handling to avoid the <kbd>x</kbd> key being assigned to both closing
    the popup _and_ expanding it.
  - (Firefox, Thunderbird) Fixed the toggle key setting to allow using
    <kbd>,</kbd>, <kbd>.</kbd>, <kbd>Home</kbd>, <kbd>End</kbd>,
    <kbd>PageUp</kbd>, <kbd>PageDown</kbd>, <kbd>Space</kbd>, <kbd>Insert</kbd>,
    <kbd>Delete</kbd>, <kbd>Up</kbd>, <kbd>Down</kbd>, <kbd>Left</kbd>,
    and <kbd>Right</kbd>.
  - (Firefox, Thunderbird) Made it possible to clear the toggle key.
- Other bug fixes
  - (Firefox) Added a workaround for a
    [Firefox bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1860486) that
    would cause 10ten to hang when changing dictionary language.
  - Fixed the popup changing width in some cases (e.g. when tabs are hidden and
    scrollbars are configured to always show)
    ([#1314](https://github.com/birchill/10ten-ja-reader/issues/1314)).
- (Firefox) Android fixes
  - Made the lookup puck handle taps and double-taps correctly on
    Firefox for Android.
  - Hid settings button in popup on Firefox for Android until
    [bug 1795449](https://bugzilla.mozilla.org/show_bug.cgi?id=1795449) is
    fixed.

## [1.15.1] - 2023-09-03

- Fixed selection styles not applying in Chrome/Edge
  ([#1297](https://github.com/birchill/10ten-ja-reader/issues/1297)).

## [1.15.0] - 2023-08-30

- Collapsed the popup window to only show the most relevant results by default
  ([#1036](https://github.com/birchill/10ten-ja-reader/issues/1036)).
  - You can restore the old behavior by choosing "Expand all entries → Words"
    from the settings screen.
  - You can view other entries by scrolling the popup window or by expanding it
    to show all entries by clicking the downward triangle button or pressing
    <kbd>x</kbd> on the keyboard.
- Made the popup show kanji details for all kanji in the longest matched word
  ([#1138](https://github.com/birchill/10ten-ja-reader/issues/1138)).
- Added a setting for changing the font size of the popup.
- Made options page support dark mode.
- Added an option to disable looking up by tapping on them on touchscreen devices
  ([#1005](https://github.com/birchill/10ten-ja-reader/issues/1005)).
- Added WaniKani data to word and kanji display
  ([#838](https://github.com/birchill/10ten-ja-reader/issues/838)).
  This can be enabled from the options page under the "Popup style" and
  "Kanji dictionary" sections.
- Added handling for kanji incorrectly encoded as radicals
  ([#1205](https://github.com/birchill/10ten-ja-reader/issues/1205)).
- Fixed handling of pages with `<frameset>` elements and nested `<iframe>`s
  ([#1241](https://github.com/birchill/10ten-ja-reader/issues/1241)).
- Fixed highlight styles on pages with strict CSP settings.

## [1.14.3] - 2023-06-05 (Chrome, Edge only)

- (Chrome, Edge) Fix generated source encoding to avoid Chrome bug.

## [1.14.1] - 2023-06-03

- Fix keyboard detection for some devices.

## [1.14.0] - 2023-04-22

- Rewrote text lookup to better handle cases of hidden content (including
  `user-select: all` content), avoid lingering popups, and improve performance
  (Fixes [#990](https://github.com/birchill/10ten-ja-reader/issues/990) and
  [#1033](https://github.com/birchill/10ten-ja-reader/issues/1033)).
- (Chrome, Edge, Safari) Added support for looking up text in shadow DOM
  elements such as are used on Bing Chat
  ([#1130](https://github.com/birchill/10ten-ja-reader/issues/1130)).
- (Chrome, Edge, Safari) Fixed a bug where overlays would be broken on
  [MangaDex](https://mangadex.org/)
  ([#1110](https://github.com/birchill/10ten-ja-reader/issues/1110)).
- (Safari) Improved popup placement when looking up words at the start of
  a line.
- (Safari) Fixed a bug where the toolbar icon would get stuck not updating.

## [1.13.6] - 2023-02-23 (Firefox, Thunderbird only)

- Fixed breakage on Firefox beta
  ([#1080](https://github.com/birchill/10ten-ja-reader/issues/1080)).

## [1.13.5] - 2022-12-02

- Added support for parsing ざるを得ない endings, e.g. 闘わざるをえなかった.
- Added support for parsing ～ないで, e.g. 払わないですんだ.
- Added an option for higher contrast pitch accent markings.
- (Chrome, Edge) Fixed the browser icon getting stuck at 100%
  ([#1003](https://github.com/birchill/10ten-ja-reader/issues/1003)).
- (Firefox) Fixed occasional flicker on loading Web pages over slow connections
  when the extension is enabled.
- Made the popup show for sites that make nested contents fullscreen such as
  Crunchyroll
  ([#1015](https://github.com/birchill/10ten-ja-reader/issues/1015)).
- Made the touchscreen puck trigger showing text boxes on
  [mokuro](https://github.com/kha-white/mokuro) that normally only show on
  hover
  ([#1009](https://github.com/birchill/10ten-ja-reader/issues/1009)).
- Fixed lookup of Japanese inside `display: contents` containers.
- Fixed lookup of Japanese with certain combinations of `display: inline-block`
  such as is used on Kanshudo.
- Made the copy overlay not show if the user has selected text in the popup.
- Made shogi shorthand matches not show up when there is a longer word match.
- Added inflection for できる so that 連絡できなかった is parsed as a single unit.
- Updated explanation text for passive deinflections to indicate that they may
  simply be sonkeigo
  ([#187](https://github.com/birchill/10ten-ja-reader/issues/187)).

## [1.12.5] - 2022-09-17

- Fixed a bug where changing tabs after pinning the popup could cause the popup
  to have the wrong size.
- Fixed a bug where the popup would be mispositioned after scrolling.

## [1.12.4] - 2022-09-12

- Fixed flickering when using hold-to-show keys and a text box is selected.

## [1.12.3] - 2022-09-12 (Firefox, Thunderbird only)

- Fixed a bug where the popup would sometimes pin when mouse interaction was
  disabled and hold-to-show keys were configured.
- Fixed detecting of pin popup keys on Safari.

## [1.12.2] - 2022-09-10 (Firefox, Thunderbird only)

- Fixed a bug that would cause the popup to effectively be pinned after releasing
  hold-to-show keys when they are set for both text and images.
- Fixed a bug that would cause unwanted pinning of the popup when hold-to-show
  keys are configured and mouse interactivity is disabled.

## [1.12.0] - 2022-09-10 (Firefox, Thunderbird only)

- Made it possible to interact with the popup by using the mouse.
  For example, you can change tabs or copy entries by clicking.
  - Note that this makes the popup tabs larger and may sometimes mean the popup
    does not dismiss as quickly.
    This behavior can be disabled from the options page under "Popup
    interactivity".
- Made the popup not move position when changing tabs via touch or mouse.
- Added a shortcut key for closing the popup (defaults to <kbd>Esc</kbd>).
- Added a shortcut key for pinning the popup (defaults to <kbd>Ctrl</kbd>).
- Added a setting to make highlight styles blue on browsers that support the CSS
  Highlight API and made the default yellow style more subdued.
- Fixed a bug where highlights might not be cleared.
- Disabled using the Highlight API on Chrome for vertical text due to
  [Chromium bug 1360724](https://bugs.chromium.org/p/chromium/issues/detail?id=1360724)

## [1.11.0] - 2022-08-29 (Firefox, Chrome, Thunderbird only)

- Made katakana headwords be shown when matching on katakana
  ([#978](https://github.com/birchill/10ten-ja-reader/issues/978)).
- Made non-matching kanji headwords be hidden when matching on kana
  ([#979](https://github.com/birchill/10ten-ja-reader/issues/979)).
- Added handling for search-only dictionary headwords.
- Made it possible to copy name preview entries to the clipboard.
- Fixed display of currency conversion etc. when there are only name results
  ([#970](https://github.com/birchill/10ten-ja-reader/issues/970)).
- Fixed handling of kanji records with multiple cross references
  ([#983](https://github.com/birchill/10ten-ja-reader/issues/983)).
- Made the label for rarely-used kanji shorter.

## [1.10.6] - 2022-07-23

- Added new field and misc tags from JMdict.
- Fixed flicker when opening options page.
- Fixed handling of <kbd>Strg</kbd> key.

## [1.10.5] - 2022-06-09

- (Firefox, Chrome, Edge) Fixed enabling of multiple windows.
- Fixed an issue with 10ten affecting the scroll height of pages
  ([#959](https://github.com/birchill/10ten-ja-reader/issues/959)).
- Fixed an issue with the popup being shown for numbers that have a comma in
  them ([#962](https://github.com/birchill/10ten-ja-reader/issues/962)).
- (Safari) Made it easier to look up text at the start of a range (typically
  text with furigana)
  ([#956](https://github.com/birchill/10ten-ja-reader/issues/956)).

## [1.10.4] - 2022-06-06 (Thunderbird only)

- Initial Thunderbird release

## [1.10.0] - 2022-05-20

- Rewrote the data downloading service to improve initial download performance
  and provide more useful download progress.

## [1.9.0] - 2022-04-28

- Made the popup display in full-screen mode so you can look up text in
  subtitles on full-screen videos
  ([#466](https://github.com/birchill/10ten-ja-reader/issues/466)).
- Added recognition for decimals numbers with kanji bases (e.g. 25.1万円)
  ([#944](https://github.com/birchill/10ten-ja-reader/issues/944)).
- Made the popup not automatically show for text elements with `title`/`alt`
  attributes when a key is required to show the popup
  ([#946](https://github.com/birchill/10ten-ja-reader/issues/946)).
- Fixed an issue where other extensions could cause the popup to be mispositioned
  ([#947](https://github.com/birchill/10ten-ja-reader/issues/947)).

## [1.8.4] - 2022-04-07

- Fixed looking up vertical text using [pdf.js](https://mozilla.github.io/pdf.js/)
  ([#938](https://github.com/birchill/10ten-ja-reader/issues/938)).
- Fixed use of the puck on Bibi reader
  ([#937](https://github.com/birchill/10ten-ja-reader/issues/937)).
- Fixed a regression in highlighting of non-BMP characters e.g. 𠏹沢.
- Made sure the popup always appears on top, even for sites like TimeTree that use
  the maximum z-index for their popups.
- Fixed a bug where the copy status message would re-appear after switching
  tabs.

## [1.7.1] - 2022-02-10

- Fixed display of the radical meaning in kanji view.

## [1.7.0] - 2022-02-05

- Added parsing for shogi moves (e.g. ☗８三銀引成).
  Thanks to [@devurandom](https://twitter.com/_dev_urandom_) for the idea and
  prototype!
- Fixed text look up for Google docs when the document is scaled.
- Fixed positioning of the puck when using a scaled viewport on non iOS Safari
  browsers.
- Made more common kana reading be displayed when looking up an entry by an
  irregular kana reading (e.g. showing ふんいき when looking up ふいんき)
  ([#877](https://github.com/birchill/10ten-ja-reader/issues/877)).
- Made irregular readings be dimmed when looking up by kanji
  (e.g. ふいんき is dimmed when looking up 雰囲気)
  ([#877](https://github.com/birchill/10ten-ja-reader/issues/877)).
- Made irregular kanji headwords be dimmed when looking up by kana
  (e.g. お母 is dimmed when looking up おふくろ)
  ([#877](https://github.com/birchill/10ten-ja-reader/issues/877)).
- Made the name preview not show the age for a name entry when only a year is
  given, or when the name is not for a person
  ([#863](https://github.com/birchill/10ten-ja-reader/issues/863)).
- Stopped the add-on from interfering with generic XML documents
  ([#902](https://github.com/birchill/10ten-ja-reader/issues/902)).
- Stopped producing source maps for Safari and Chromium releases since they
  have trouble loading source maps from extension URLs producing an annoying
  message in the Javascript console in Chrome
  ([#890](https://github.com/birchill/10ten-ja-reader/issues/890)).

## [1.6.1] - 2021-12-16 (Chrome, Edge, Safari)

- Fixed looking up text in text boxes when the document is scrolled on
  Chrome/Edge/Safari
  ([#856](https://github.com/birchill/10ten-ja-reader/issues/856)).

## [1.6.0] - 2021-12-09

- Added support for copying entries from touch devices by tapping the entry.
- Added support for looking up words on touch screens by tapping the word
  ([#845](https://github.com/birchill/10ten-ja-reader/issues/845)).
- Made copying to the clipboard work for HTTP sites
  ([#157](https://github.com/birchill/10ten-ja-reader/issues/157)).

## [1.5.0] - 2021-11-08

- Added support for Google Docs' annotated canvas.
  Note that this does not yet work in Safari due to [Safari bug
  232781](https://bugs.webkit.org/show_bug.cgi?id=232781)
- Show the age next to names for people with birth dates.
- Allow setting the hold to show keys in active tab mode too (Safari)
  ([#818](https://github.com/birchill/10ten-ja-reader/issues/818)).
- Hide senses that don't apply to the looked-up text.
- Replace "(trademark)" text with ™.
- Stop showing the popup for number-only matches in the name dictionary
  (e.g. 64)
  ([#811](https://github.com/birchill/10ten-ja-reader/issues/811)).
- Fix formatting of options page on Firefox for Android (Nightly).

## [1.4.8] - 2021-10-21

- Stop interfering with interactive standalone SVG images
  ([#793](https://github.com/birchill/10ten-ja-reader/issues/793)).
- Made the popup show again on standalone SVG images.
- Fixed popup positioning for iframes with borders
  (e.g. the [Bibi EPUB reader](https://bibi.epub.link/))
  ([#803](https://github.com/birchill/10ten-ja-reader/issues/803))

## [1.4.7] - 2021-10-08

- Minor fixes to currency data fetching and error reporting.

## [1.4.3] - 2021-10-01 (Firefox, Chrome, Mac Safari, iOS Safari)

- Expands numbers that include kanji characters and aren't in the dictionary
  (e.g. 9万8800, 365億).
- Adds an option to disable currency conversion.
- Fixes a bug where popups were not scrollable when no tabs are shown.
- Forces Google Docs to use HTML mode (for now anyway)
  ([#782](https://github.com/birchill/10ten-ja-reader/issues/782)).
- Ignores zero-width non-joiner characters (which Google Docs sometimes likes to
  put between characters).
- Handles `-webkit-user-select: none` content (such as
  [bookwalker.jp](https://bookwalker.jp)'s popup window) on Safari better
  ([#773](https://github.com/birchill/10ten-ja-reader/issues/773)).

## [1.4.2] - 2021-09-24

- Added onboarding screens for iOS.
- Made sure the pop-up and puck appear above various advertisements and headers.
- Improved handling of various network errors.

## [1.4.1] - 2021-09-22 (Firefox, Chrome, Edge, Mac Safari)

- Made sure the currency list is sorted correctly in Safari.

## [1.4.0] - 2021-09-22 (iOS Safari)

- Added a "puck" for looking up words on touch screens.
  A **big** thanks to [@shirakaba](https://github.com/shirakaba) for making this
  happen!
- Add conversion of currency amounts (e.g. 8万 8千円, 100億円)
- Fixed a shortcut key handling bug on Edge.

## [1.3.6] - 2021-09-16 (Firefox, Chrome, Edge)

- Fixed a regression in popup layout when the tabs are on the side on touch
  screens

## [1.3.5] - 2021-09-15 (Firefox, Chrome)

- Overhauled popup positioning to better correspond with old behavior
  ([#756](https://github.com/birchill/10ten-ja-reader/issues/756)).
- Reworked iframe message passing to prevent interfering with pages like
  Azure portal
  ([#747](https://github.com/birchill/10ten-ja-reader/issues/747)).

## [1.3.4] - 2021-09-10 (Firefox, Chrome)

- Fixed another popup positioning issue.

## [1.3.3] - 2021-09-09 (Firefox)

- Fixed some popup positioning issues.
- Prevented the popup from showing for images where the alt text is 画像 (e.g. on
  Twitter).

## [1.3.2] - 2021-09-09 (Firefox)

- Stopped the popup for showing up for all numbers
  ([#749](https://github.com/birchill/10ten-ja-reader/issues/749)).

## [1.3.1] - 2021-09-08 (Firefox)

- Added recognition for counters that start with half-width numerals
  (e.g. 1つ, 14日, see
  [#709](https://github.com/birchill/10ten-ja-reader/issues/709)).
- Fixed a bug when displaying the options page.

## [1.3.0] - 2021-09-08 (Firefox)

- Optimized lookup performance.
- Restored the behavior where 10ten would translate the alt/title attributes on
  images and form elements which was accidentally disabled in the previous
  version.
- Added an option to disable translating the alt/title attribute on images
  ([#140](https://github.com/birchill/10ten-ja-reader/issues/140)).
- Thoroughly reworked popup positioning.

## [1.2.3] - 2021-08-26

- Made the lookup better reflect the cursor position
  ([#278](https://github.com/birchill/10ten-ja-reader/issues/278)).
- Fixed a hang when using 10ten together with the LiveTL extension
  ([#733](https://github.com/birchill/10ten-ja-reader/issues/733)).
- Fixed display of popup when using 10ten together with the LiveTL extension
  ([#734](https://github.com/birchill/10ten-ja-reader/issues/734)).
- Fixed a regression in the highlighting of text when only content that is not a
  dictionary entry matches.

## [1.2.2] - 2021-08-19

- Made popups for iframes be shown in the topmost window
  ([#13](https://github.com/birchill/10ten-ja-reader/issues/13)).
- Fixed flickering on links that use transitions
  ([#723](https://github.com/birchill/10ten-ja-reader/issues/723),
  [#724](https://github.com/birchill/10ten-ja-reader/issues/724)).
- Fixed a regression where non-Firefox browsers could not look up the first
  character in a text box
  [#725](https://github.com/birchill/10ten-ja-reader/issues/725)).

## [1.2.1] - 2021-08-12

- Fixed handling of scrollable text boxes in Chromium and Safari browsers.
- Made number handling a bit more tolerant so 8万 8千平㍍ etc. would be recognized.
- Fixed a case where the options page would flicker incessantly
  ([#708](https://github.com/birchill/10ten-ja-reader/issues/708)).
- Made the popup respond better when there is little horizontal space.
- Avoided reporting errors for missing kanji components.

## [v1.2.0] - 2021-07-29 (Firefox, Chrome, Safari, Edge)

- Added an option to display tabs on the sides or hide them altogether
  ([#688](https://github.com/birchill/10ten-ja-reader/issues/688)).
- Added an option to change the toolbar icon to a 天 character instead
  ([#689](https://github.com/birchill/10ten-ja-reader/issues/689)).
- Made katakana name matches show up in the name preview

## [1.1.4] - 2021-07-23 (Firefox)

- Made the dark theme have a higher contrast
  ([#692](https://github.com/birchill/10ten-ja-reader/issues/692)).

## [1.1.3] - 2021-07-22 (Firefox, Chrome, Safari, Edge)

- Made icons a little more visible in disabled state when using dark mode
  ([#687](https://github.com/birchill/10ten-ja-reader/issues/687)).
- Fixed handling of <kbd>Shift</kbd> on Safari.

## [1.1.2] - 2021-07-21 (Firefox)

- Fixed translation of "Control" key for "hold to show" keys on Mac.
- Added a release not about failed updates.

## [1.1.1] - 2021-07-21 (Firefox)

- Added tabs for showing different dictionary results and made them interactive
  on touch screen devices
  ([#675](https://github.com/birchill/10ten-ja-reader/discussions/675)).

- Added automatic translation of 畳/帖 and square measurements such as
  四畳半, 6.5帖, 10㎡, or 十二平米
  ([#642](https://github.com/birchill/10ten-ja-reader/issues/642)).

- (Re-)added an option to show only kanji entries by holding <kbd>Shift</kbd>
  ([#650](https://github.com/birchill/10ten-ja-reader/issues/650)).

  This behavior must be explicitly enabled from the settings page.
  However, it should now work without requiring the "Hold to show pop-up" feature.

- Made the shortcut key to toggle the extension on and off no longer be
  synchronized so that the full range of modified keys can be used and so that
  extensions keys configured via the browser UI interoperate with the extension
  UI better
  ([#652](https://github.com/birchill/10ten-ja-reader/issues/652)).

- Made the popup not show up so eagerly when the hold-to-show key(s) is/are
  pressed and a text box is focussed since it can interfere with copying and
  pasting
  ([#651](https://github.com/birchill/10ten-ja-reader/issues/651)).

- Optimized searching for variants of 長音 (ー) and 旧字体 to perform fewer
  lookups while considering all 長音 variations for name entries.

- Defined an additional key that can be configured to switch dictionaries,
  <kbd>n</kbd>, since <kbd>Shift</kbd> can be unavailable when Firefox's
  resist fingerprinting mode is enabled.

- Added a notification that incomplete results are shown when the dictionary
  data is being updated.

- Added a hint indicating the keys that can be used to switch dictionaries.

## [1.0.0] - 2021-06-15 (Safari only)

- Added new default (gray) theme.
- Made default theme switch between light/dark based on system dark-mode setting.
- Tweaked colours and spacing of existing themes.

## [0.5.14] - 2021-06-19 (Chrome only)

- Drop `tabs` permission from manifest.

## [0.5.13] - 2021-06-17 (not shipped)

- Drop `clipboardWrite` permission from Chromium manifest since it's not needed
  there.

## [0.5.12] - 2021-06-17 (Firefox, Edge)

- Fix some bugs in the lookup cache

## [0.5.10] - 2021-06-17

- Add a series of performance optimizations to improve lookup performance.

## [0.5.8] - 2021-06-10

- Added support for handling 旧字体 (_kyuujitai_, old characters)
  ([#604](https://github.com/birchill/10ten-ja-reader/issues/604))
- Added support for converting Japanese era years that use a series
  of digits (e.g. 昭和二〇年)
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
- Updated to latest changes to JMDict/JMnedict database (new field types, gloss
  types, dialects etc.)

## [0.5.7] - 2021-05-22

- Fixed handling of the first character of a text box
  ([#605](https://github.com/birchill/10ten-ja-reader/issues/605))
- Made Rikaichamp better able to recognize covered-up text such as is used on
  [asahi.com](https://asahi.com) and [nikkei.com](https://nikkei.com)

## [0.5.5] - 2021-05-11

- Fixed release infrastructure and tweaked options page.

## [0.5.3] - 2021-05-10

- Fixed coloring of kanji components when viewing text documents.
- Fixed a regression in copy mode meaning the visual indication that it
  finished would never show.

## [0.5.2] - 2021-04-29

- Fixed popup positioning for documents in quirks mode
  ([#576](https://github.com/birchill/10ten-ja-reader/issues/576))
- Added a thin grey border to black popup
  ([#577](https://github.com/birchill/10ten-ja-reader/issues/577))
- Fixed Rikaichamp not working in certain iframes
  ([#584](https://github.com/birchill/10ten-ja-reader/issues/584))
- Made Rikaichamp be enabled earlier in the document load cycle.

## [0.5.1] - 2021-04-19

- Make <kbd>j</kbd> / <kbd>k</kbd> keys wrap-around when they reach the limit.

## [0.5.0] - 2021-04-17

- Adds ability to move the popup window using the <kbd>j</kbd> / <kbd>k</kbd>
  keys.
  Disabled by default. Please enable from the options screen.
  ([#109](https://github.com/birchill/10ten-ja-reader/issues/109))

## [0.4.0] - 2021-04-08

- Switched to using IndexedDB database for looking up words

  - **Non-English definitions are now supported**
  - Rikaichamp now uses much less memory
  - All dictionaries are automatically updated weekly by downloading
    just the changed entries
  - While the words dictionary is being downloaded or updated, or in
    case there is an error applying it (e.g. lack of disk space)
    a fallback English dictionary is used.

    Users who encounter errors due to lack of disk space are encouraged
    to uninstall and re-install the add-on. That _might_ resolve the
    issue.

- Various fixes were added the order in which entries are displayed.
- Made Rikaichamp recognize the full range of characters in CJK Unified
  Ideographs Extension B so that some more rare kanji are recognized.

## [0.3.5] - 2021-03-19

- Improved popup positioning for vertical text (and hopefully some other
  situations too).
- Improved error handling for low disk space situations.

## [0.3.4] - 2021-03-01

- Made rikaichamp traverse text in `inline-block` elements so that it can
  read YouTube subtitles with ruby
  ([#535](https://github.com/birchill/10ten-ja-reader/issues/535))
- (Hopefully) fixed handling of low disk space situations
  ([#428](https://github.com/birchill/10ten-ja-reader/issues/428))

## [0.3.3] - 2020-12-09

- Moved display of part-of-speech labels to the start of the definition
  and grouped them when they are repetitive
  ([#436](https://github.com/birchill/10ten-ja-reader/issues/436))
- Made Rikaichamp include する in the match range for nouns that take
  する (`vs` nouns)
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
  ([#180](https://github.com/birchill/10ten-ja-reader/issues/180))
- Fixed recognition of vs-c verbs (suru verbs ending in す instead of する,
  e.g. 兼した)
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
- Stop trying to convert years written as a transliteration of
  digits (e.g. 令和七九年 instead of 令和七十九年)
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
- Moved Rikaichamp popup to an isolated shadow DOM tree so that it should
  be more robust when used on pages that set styles in ways that conflict
  with Rikaichamp's styles
  ([#144](https://github.com/birchill/10ten-ja-reader/issues/144))

## [0.3.2] - 2020-12-03

- Made all kanji headwords be shown for an entry, not just the matching ones
  ([#438](https://github.com/birchill/10ten-ja-reader/issues/438)).
  Non-matching kanji headwords are dimmed.
- Added recognition of full-width alphanumerics (e.g. ８月, Ｂ級グルメ)
  ([#96](https://github.com/birchill/10ten-ja-reader/issues/96))
- Allowed Rikaichamp to recognize characters in the CJK Unified Ideographs
  Extension B range (e.g. 𠏹沢).
- Tweaked name preview feature to match names that start with hiragana
  (e.g. ほとけ沢)
- Added support for recognizing き inflection of i-adjectives
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
  ([#435](https://github.com/birchill/10ten-ja-reader/issues/435))
- Fixed an issue with keydown listeners not being unregistered causing
  the "toggle definitions" feature to misbehave
  ([#439](https://github.com/birchill/10ten-ja-reader/issues/439))
- Added a few missing word entries (e.g. 印鑑)
- Fixed popup window language tagging so Japanese and Chinese text are rendered
  correctly in the Chinese localization.
- Localized a few hardcoded English strings
  with help from [@SaltfishAmi](https://github.com/SaltfishAmi)

## [0.3.1] - 2020-11-26

- Fix an issue with the SVG star being too large when upgrading and the old
  stylesheet is still in effect.

## [0.3.0] - 2020-11-26

- Rewrote word definition display to use structured data.
  - Pitch accent information is displayed.
  - Word entry metadata (e.g. part of speech, field, etc.)
    is formatted appropriately, configurable, and localized.
  - Indicators for common words are configurable and show two levels of
    frequency
    (★ for common words and ☆ for somewhat common words)

## [0.2.6] - 2020-09-11

- Made name preview not show up for hiragana-only matches
  ([#372](https://github.com/birchill/10ten-ja-reader/issues/372)).
- Made the name dictionary results show up first when there is a match there but
  none in the word dictionary
  ([#374](https://github.com/birchill/10ten-ja-reader/issues/374)).
- Updated word dictionary to 2020-09-09 snapshot.

## [0.2.5] - 2020-09-09

- Updated Chinese (simplified) localization.
- Made name preview feature show up to three results.
- Updated word dictionary to 2020-09-08 snapshot.

## [0.2.4] - 2020-09-08

- Further tweaks to error reporting.

## [0.2.3] - 2020-09-08

- Really fix error reporting.

## [0.2.2] - 2020-09-08

- Fixed error reporting.

## [0.2.1] - 2020-09-08

- Fixed a bug that would cause name data not to be immediately downloaded when
  updating.

## [0.2.0] - 2020-09-08

- Made names data be downloaded out-of-band. As a result names data is
  updated weekly and does not consume memory.
- Made display of names prioritize entries that match the selected text more
  closely (e.g. katakana entries are presented first when the text is katakana).
- Fixed the display of multiple annotations for name data
  ([#201](https://github.com/birchill/10ten-ja-reader/issues/201)).
- Added recognition for a variety of composed characters (e.g. ㋕㌀㋿ ).
- Improved expansion of ー so that now オーサカ is recognized.
- Made the word list display the first match from the names dictionary if it has
  longer length than any of the matches from the word dictionary
  ([#256](https://github.com/birchill/10ten-ja-reader/issues/256)).
- Updated word dictionary to 2020-09-06 snapshot

## [0.1.20] - 2020-08-11

- Added Chinese (simplified) localization
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
- Added recognition of ん as a negative form (分からん, 知らん etc.)
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
- Added recognition for slightly longer matches
  ([#319](https://github.com/birchill/10ten-ja-reader/issues/319))
- Added formatting for phantom kanji and kokuji kanji metadata
- Updated word and name dictionaries to 2020-08-10 snapshot

## [0.1.19] - 2020-06-24

- Fixed recognition of irregular verbs いらっしゃいます and おっしゃいます
  ([#303](https://github.com/birchill/10ten-ja-reader/issues/303))
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
- Fixed mis-recognition of くれる and くさせる
  ([#301](https://github.com/birchill/10ten-ja-reader/issues/301))
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
- Fixed recognition of ー (長音符) after ゛゜ and ゃゅょ (e.g. じーちゃん)
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
- Added language attribute to popup window so we default to Japanese characters
  even on Chinese language pages
  thanks to [@SaltfishAmi](https://github.com/SaltfishAmi)
- Fixed selection range when matching years
  ([#286](https://github.com/birchill/10ten-ja-reader/issues/286))
- Updated word and name dictionaries to 2020-06-23 snapshot

## [0.1.18] - 2020-05-18

- Ignore <kbd>Shift</kbd> when combined with other modifier keys
  ([#235](https://github.com/birchill/10ten-ja-reader/issues/235))
- Fixed a bug in handling ー after an い sound
  ([#246](https://github.com/birchill/10ten-ja-reader/issues/246))
  thanks to [@claudiofreitas](https://github.com/claudiofreitas)
- Fixed regression to recognizing -masu stem forms
  ([#245](https://github.com/birchill/10ten-ja-reader/issues/245))
- Fixed recognizing decomposed forms
  ([#264](https://github.com/birchill/10ten-ja-reader/issues/264))
- Updated word and name dictionaries to 2020-05-17 snapshot.

## [0.1.17] - 2020-04-31

- Added support for recognizing and converting Japanese era years
  昭和５６年、令和元年、平成三十一年 etc.
  ([#202](https://github.com/birchill/10ten-ja-reader/issues/202))
- Made dictionary matching recognize ー in 頑張ろー and そーゆー etc.
  ([#174](https://github.com/birchill/10ten-ja-reader/issues/174))
- Added matching for continous forms such as 食べている and 食べてた
  ([#73](https://github.com/birchill/10ten-ja-reader/issues/73))
- Updated word and name dictionaries to 2020-04-12 snapshot.

## [0.1.16] - 2020-01-07

- Made dictionary matching not split up yo-on like じゃ
  ([#49](https://github.com/birchill/10ten-ja-reader/issues/49))
- Tightened up error reporting
- Updated word and name dictionaries to 2020-01-06 snapshot.

## [0.1.15] - 2019-12-23

- Made database handling (hopefully) more robust

## [0.1.14] - 2019-12-12

- Add more robust handling of extension storage
- Make browser action warning less noisy

## [0.1.13] - 2019-12-12

- Yet more database logging

## [0.1.12] - 2019-12-11

- Avoid reporting update errors twice
- Try to make updating more robust
- Add further logging

## [0.1.11] - 2019-12-10

- Add even more logging

## [0.1.10] - 2019-12-10

- Add some more logging

## [0.1.9] - 2019-12-10

- Switch to using idb instead of dexie.
- Update word and name dictionaries to 2019-12-09 snapshot.

## [0.1.8] - 2019-12-04

- Make failed downloads resume from most recent failure.

## [0.1.7] - 2019-12-03

- Improve error handling and reporting for download errors.

## [0.1.6] - 2019-11-29

- Avoid looking up database when it is unavailable.

## [0.1.5] - 2019-11-29

- Make sure asynchronous download errors are handled correctly.

## [0.1.4] - 2019-11-29

- Better handle the case where IndexedDB is unavailable
  ([#148](https://github.com/birchill/10ten-ja-reader/issues/148))
- Fix some cases where the content in the kanji window wraps
  ([#149](https://github.com/birchill/10ten-ja-reader/issues/149))

## [0.1.3] - 2019-11-27

- Updated database interaction to better handle initial language setting.
- Added logging to various database interactions.

## [0.1.2] - 2019-11-27

- Made kanji dictionary always updated and not loaded into memory.
- Updated word and name dictionaries to 2019-11-25 snapshot.

## [0.0.32] - 2019-07-10

- Added support for displaying romaji (off by default)
  ([#23](https://github.com/birchill/10ten-ja-reader/issues/23))
- Updated dictionaries to 2019-07-05 snapshot.

## [0.0.31] - 2019-04-03

- Updated dictionaries to 2019-04-02 snapshot (to include 令和).

## [0.0.30] - 2019-03-12

- Fixed looking up of entries where the reading is in Katakana
  ([#84](https://github.com/birchill/10ten-ja-reader/issues/84))
- Reworked handling of keystrokes when a textbox is in use.
  Hopefully Rikaichamp listens to keystrokes when you expect it to and ignores
  them when you don't.
  ([#20](https://github.com/birchill/10ten-ja-reader/issues/20))
- Updated dictionaries to 2019-03-11 snapshot.

## [0.0.29] - 2019-01-27

- Added kanji references for Conning's 'The Kodansha Kanji Learner's Course'
  thanks to [@Kala-J](https://github.com/Kala-J).
- Make the kanji view show the traditional radical (not the Nelson radical).
  The Nelson radical will be shown in the references section in cases where it
  differs.
- Kanji components are now included when copying a kanji entry to the clipboard
- Updated dictionaries to 2019-01-26 snapshot.

## [0.0.28] - 2018-12-31

- Added more user-friendly display of annotations for the names dictionary
  ([#64](https://github.com/birchill/10ten-ja-reader/issues/64))
- Made pop-up key handling work even when CapsLock is on
  ([#72](https://github.com/birchill/10ten-ja-reader/issues/72))
- Updated dictionaries to 2018-12-30 snapshot.

## [0.0.27] - 2018-12-28

- Fixed highlighting so it works correctly with faux-ruby as used on renshuu.org
  and Japanese learners' stack exchange
  ([#67](https://github.com/birchill/10ten-ja-reader/issues/67))
- Fixed result trimming so that it sorts by priority before trimming
  ([#70](https://github.com/birchill/10ten-ja-reader/issues/70))
- Updated dictionaries to 2018-12-27 snapshot.

## [0.0.26] - 2018-11-09

- Added support for copying entries to the clipboard.
  Press 'c' when the popup is displayed then follow the on-screen prompts.
  ([#50](https://github.com/birchill/10ten-ja-reader/issues/50))
- Added Kanji kentei levels to kanji popup
- Added support for parsing ぬ verbs
  ([#56](https://github.com/birchill/10ten-ja-reader/issues/56))
  thanks to [@ispedals](https://github.com/ispedals).
- Added deinflecting き → 来る
  ([#59](https://github.com/birchill/10ten-ja-reader/issues/59))
  thanks to [@ispedals](https://github.com/ispedals).
- Added support for looking up various conjugated irregular verbs and
  Yodan verbs and improved lookup for regular verbs
  ([#58](https://github.com/birchill/10ten-ja-reader/issues/58)).
- Made the 'Toggle definitions' key (<kbd>d</kbd>) be disabled by
  default ([#57](https://github.com/birchill/10ten-ja-reader/issues/57)).
  If you use this key, you will need to re-enable it from the extension options
  page.
- Updated dictionaries to 2018-11-08 snapshot.

## [0.0.25] - 2018-09-27

- Fixed Japanese localization thanks to [@piroor](https://github.com/piroor).
- Fixed ordering of entries so that more common entries appear first
  ([#26](https://github.com/birchill/10ten-ja-reader/issues/26)).
- Added parsing for とく・どく forms
  ([#51](https://github.com/birchill/10ten-ja-reader/issues/51)).
- Updated dictionaries to 2018-09-26 snapshot.

## [0.0.24] - 2018-08-29

- Made the hotkey for enabling Rikaichamp configurable
  ([#30](https://github.com/birchill/10ten-ja-reader/issues/30)).
- Introduced hold-to-display hotkey
  ([#33](https://github.com/birchill/10ten-ja-reader/issues/33)).
- Localized UI into Japanese.
- Various tweaks to option page styling.
- Updated dictionaries to 2018-08-28 snapshot.

## [0.0.23] - 2018-08-08!

- Properly fixed pre-Firefox 57 installs.
- Tweaked timeout for file reads so it is initially shorters.
- Tweaked diagnostics for longer loads.
- Updated dictionaries to 2018-08-07 snapshot.

## [0.0.22] - 2018-08-08

- Added temporary workaround for users of Firefox <56 (but seriously, please
  upgrade your Firefox).

## [0.0.21] - 2018-08-08

- Added timeout handling to deal with file loads that seem to never end
  (particularly on Linux and on startup / upgrade).
- Made it possible to recover from load errors.

## [0.0.20] - 2018-08-07 [YANKED]

- Hopefully made loading data files more robust to reduce the likelihood of
  errors on startup.
- Made names display in two columns when necessary.
- Updated word, names, and **kanji** dictionaries to 2018-08-06 snapshot.

## [0.0.19] - 2018-07-28

- Added even more diagnostics to dictionary loading.
- Simplified dictionary loading somewhat.
- Updated word and names dictionaries to 2018-07-27 snapshot.

## [0.0.18] - 2018-07-26

- Added more diagnostics to try to narrow down the cause of Rikaichamp
  occasionally getting stuck loading
  ([#45](https://github.com/birchill/10ten-ja-reader/issues/45)).
- Fixed handling of full-width tilde.
- Updated word and names dictionaries to 2018-07-25 snapshot.

## [0.0.17] - 2018-07-14

- Added diagnostic error reporting for failures to load the dictionary.
  Attempting to fix the issue with Rikaichamp getting stuck loading
  ([#45](https://github.com/birchill/10ten-ja-reader/issues/45)).
- Updated word and names dictionaries to 2018-07-13 snapshot.

## [0.0.16] - 2018-06-28

- Hopefully fixed the issue where the extension would sometimes stop working
  ([#17](https://github.com/birchill/10ten-ja-reader/issues/17)).
- Updated word and names dictionaries to 2018-06-27 snapshot.

## [0.0.15] - 2018-06-22

- Made the extension continue to work when the timer precision is reduced
  ([#35](https://github.com/birchill/10ten-ja-reader/issues/35)).
- Updated word and names dictionaries to 2018-06-21 snapshot.

## [0.0.14] - 2018-06-01

- Improved ruby handling: Fixed text selection when `<rb>` elements are used
  ([#37](https://github.com/birchill/10ten-ja-reader/issues/37)).
- Improved grammar reporting:
  - Fixed the reported inflection of passive godan verbs
    ([#36](https://github.com/birchill/10ten-ja-reader/issues/36)).
  - Added support for reporting causative passives.
  - Fixed deinflection of させる for verbs ending in す (e.g.
    起こさせる → 起こす).
- Stability: Fixed one case where the rikaichamp popup might get stuck.
- Minor tweak to options page.
- Improved bundling of scripts using webpack.
- Updated word and names dictionaries to 2018-05-31 snapshot.

## [0.0.13] - 2018-01-28

- (Hopefully) fixed text box handling, especially scroll restoration.
- Made pop-up not show up when the mouse if far from the target word.
- Updated word and names dictionaries to 2018-01-28 snapshot.

## [0.0.12] - 2017-12-20

- Add popup style selection to settings panel (thanks to [@kikaxa](https://github.com/kikaxa)).
- Fixed a bug where the popup would not appear correctly when dealing with pages
  with mismatched encodings.
- Disabled the popup while selecting text.
- Updated word and names dictionaries to 2017-12-19 snapshot.

## [0.0.11] - 2017-11-23

- Fixed hidden popup from interfering with page contents.
- Make popup now show when the mouse is moving at high speed.
- Possibly improved popup fadeout performance.
- Make rikaichamp a little more thorough about cleaning up after itself.
- Updated word dictionary to 2017-11-22 snapshot.

## [0.0.10] - 2017-11-19

- Made the extension remember if it was enabled across browser restarts (this
  time for sure).
- Added a description of the Alt+R shortcut key to the options page.

## [0.0.9] - 2017-11-18

- Added "Enable Rikaichamp" to the context menu (can be disabled from the
  options).
- Added Alt+R as a shortcut key for enabling/disabling Rikaichamp.
- ~~Made the extension remember if it was enabled across browser restarts
  (hopefully).~~ (It turns out this didn't work)
- Updated word dictionary to 2017-11-17 snapshot.

## [0.0.8] - 2017-11-13

- Added option to disable text highlighting (thanks to [@nanaya](https://github.com/nanaya)).
- Added option to disable individual keyboard shortcuts.
- Dropped ability to adjust vertical position of pop-up using j/k. Please let me
  know if you used this feature and I'll add it back!
- Updated word dictionary to 2017-11-12 snapshot.

## [0.0.7] - 2017-11-06

- Fixed incorrect positioning of pop-up on initial display.
- Updated word dictionary to 2017-11-05 snapshot.

## [0.0.6] - 2017-10-30

- Improved text box selection handling including ignoring key strokes when
  a text box is selected.
- Improved options synchronization.

## [0.0.5] - 2017-10-24

- Fixed a bug where keyboard events would get ignored while the pop-up was
  showing.

## [0.0.4] - 2017-10-20

- Initial version (yes, it took me four attempts to publish).

[unreleased]: https://github.com/birchill/10ten-ja-reader/compare/v1.23.0...HEAD
[1.23.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.22.0...v1.23.0
[1.22.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.21.1...v1.22.0
[1.21.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.21.0...v1.21.1
[1.21.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.20.0...v1.21.0
[1.20.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.19.1...v1.20.0
[1.19.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.19.0...v1.19.1
[1.19.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.18.0...v1.19.0
[1.18.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.17.1...v1.18.0
[1.17.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.17.0...v1.17.1
[1.17.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.16.2...v1.17.0
[1.16.2]: https://github.com/birchill/10ten-ja-reader/compare/v1.16.1...v1.16.2
[1.16.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.16.0...v1.16.1
[1.16.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.15.1...v1.16.0
[1.15.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.15.0...v1.15.1
[1.15.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.14.3...v1.15.0
[1.14.3]: https://github.com/birchill/10ten-ja-reader/compare/v1.14.1...v1.14.3
[1.14.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.14.0...v1.14.1
[1.14.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.13.6...v1.14.0
[1.13.6]: https://github.com/birchill/10ten-ja-reader/compare/v1.13.5...v1.13.6
[1.13.5]: https://github.com/birchill/10ten-ja-reader/compare/v1.12.5...v1.13.5
[1.12.5]: https://github.com/birchill/10ten-ja-reader/compare/v1.12.4...v1.12.5
[1.12.4]: https://github.com/birchill/10ten-ja-reader/compare/v1.12.3...v1.12.4
[1.12.3]: https://github.com/birchill/10ten-ja-reader/compare/v1.12.2...v1.12.3
[1.12.2]: https://github.com/birchill/10ten-ja-reader/compare/v1.12.0...v1.12.2
[1.12.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.10.6...v1.11.0
[1.10.6]: https://github.com/birchill/10ten-ja-reader/compare/v1.10.5...v1.10.6
[1.10.5]: https://github.com/birchill/10ten-ja-reader/compare/v1.10.4...v1.10.5
[1.10.4]: https://github.com/birchill/10ten-ja-reader/compare/v1.10.0...v1.10.4
[1.10.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.8.4...v1.9.0
[1.8.4]: https://github.com/birchill/10ten-ja-reader/compare/v1.7.1...v1.8.4
[1.7.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.6.1...v1.7.0
[1.6.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.4.8...v1.5.0
[1.4.8]: https://github.com/birchill/10ten-ja-reader/compare/v1.4.7...v1.4.8
[1.4.7]: https://github.com/birchill/10ten-ja-reader/compare/v1.4.3...v1.4.7
[1.4.3]: https://github.com/birchill/10ten-ja-reader/compare/v1.4.2...v1.4.3
[1.4.2]: https://github.com/birchill/10ten-ja-reader/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.3.6...v1.4.0
[1.3.6]: https://github.com/birchill/10ten-ja-reader/compare/v1.3.5...v1.3.6
[1.3.5]: https://github.com/birchill/10ten-ja-reader/compare/v1.3.4...v1.3.5
[1.3.4]: https://github.com/birchill/10ten-ja-reader/compare/v1.3.3...v1.3.4
[1.3.3]: https://github.com/birchill/10ten-ja-reader/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/birchill/10ten-ja-reader/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.2.3...v1.3.0
[1.2.3]: https://github.com/birchill/10ten-ja-reader/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/birchill/10ten-ja-reader/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.1.4...v1.2.0
[1.1.4]: https://github.com/birchill/10ten-ja-reader/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/birchill/10ten-ja-reader/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/birchill/10ten-ja-reader/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.0.0...v1.1.1
[1.0.0]: https://github.com/birchill/10ten-ja-reader/compare/v1.5.14...v1.0.0
[0.5.14]: https://github.com/birchill/10ten-ja-reader/compare/v1.5.13...v0.5.14
[0.5.13]: https://github.com/birchill/10ten-ja-reader/compare/v0.5.12...v0.5.13
[0.5.12]: https://github.com/birchill/10ten-ja-reader/compare/v0.5.10...v0.5.12
[0.5.10]: https://github.com/birchill/10ten-ja-reader/compare/v0.5.8...v0.5.10
[0.5.8]: https://github.com/birchill/10ten-ja-reader/compare/v0.5.7...v0.5.8
[0.5.7]: https://github.com/birchill/10ten-ja-reader/compare/v0.5.5...v0.5.7
[0.5.5]: https://github.com/birchill/10ten-ja-reader/compare/v0.5.3...v0.5.5
[0.5.3]: https://github.com/birchill/10ten-ja-reader/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/birchill/10ten-ja-reader/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/birchill/10ten-ja-reader/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/birchill/10ten-ja-reader/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/birchill/10ten-ja-reader/compare/v0.3.5...v0.4.0
[0.3.5]: https://github.com/birchill/10ten-ja-reader/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/birchill/10ten-ja-reader/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/birchill/10ten-ja-reader/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/birchill/10ten-ja-reader/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/birchill/10ten-ja-reader/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/birchill/10ten-ja-reader/compare/v0.2.6...v0.3.0
[0.2.6]: https://github.com/birchill/10ten-ja-reader/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/birchill/10ten-ja-reader/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/birchill/10ten-ja-reader/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/birchill/10ten-ja-reader/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/birchill/10ten-ja-reader/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/birchill/10ten-ja-reader/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.20...v0.2.0
[0.1.20]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.19...v0.1.20
[0.1.19]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.18...v0.1.19
[0.1.18]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.17...v0.1.18
[0.1.17]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.16...v0.1.17
[0.1.16]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.15...v0.1.16
[0.1.15]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.14...v0.1.15
[0.1.14]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.13...v0.1.14
[0.1.13]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.12...v0.1.13
[0.1.12]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.11...v0.1.12
[0.1.11]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/birchill/10ten-ja-reader/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.32...v0.1.2
[0.0.32]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.31...v0.0.32
[0.0.31]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.30...v0.0.31
[0.0.30]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.29...v0.0.30
[0.0.29]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.28...v0.0.29
[0.0.28]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.27...v0.0.28
[0.0.27]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.26...v0.0.27
[0.0.26]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.25...v0.0.26
[0.0.25]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.24...v0.0.25
[0.0.24]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.23...v0.0.24
[0.0.23]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.22...v0.0.23
[0.0.22]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.21...v0.0.22
[0.0.21]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.20...v0.0.21
[0.0.20]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.19...v0.0.20
[0.0.19]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.18...v0.0.19
[0.0.18]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.17...v0.0.18
[0.0.17]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.16...v0.0.17
[0.0.16]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.15...v0.0.16
[0.0.15]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.14...v0.0.15
[0.0.14]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.13...v0.0.14
[0.0.13]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.12...v0.0.13
[0.0.12]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.11...v0.0.12
[0.0.11]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.10...v0.0.11
[0.0.10]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.9...v0.0.10
[0.0.9]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.8...v0.0.9
[0.0.8]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.7...v0.0.8
[0.0.7]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/birchill/10ten-ja-reader/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/birchill/10ten-ja-reader/releases/tag/v0.0.4
