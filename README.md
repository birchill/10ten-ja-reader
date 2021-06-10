# Rikaichamp!

![](https://github.com/birtles/rikaichamp/workflows/Automated%20tests/badge.svg)
![Twitter Follow](https://img.shields.io/twitter/follow/rikaichamp)

A browser extension to look up Japanese words with the hover of a mouse.

## Table of Contents

- [Features](#features)
- [Installing](#installing)
- [Usage](#usage)
- [Building from source](#building-from-source)
- [Contributing](#contributing)
- [Contributors](#contributors)

## Features

Forked from Rikaikun in 2017 it includes:

- Pitch accent information

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/pitch-accent-cropped.png" alt="Screen shot showing pitch accent information" title="Pitch accent information" width="480">

- Support for non-English dictionaries

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/russian-cropped.png" alt="Screen shot showing Russian translation" title="Russian translation" width="480">

- Dictionaries that update automatically every week by fetching just the updated entries
- Overhauled dictionary entry display to make it much easier to read

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/word-display-cropped.png" alt="Screen shot showing how definitions are grouped by part-of-speech" title="Some of the features of word display" width="640">

- Automatic translation of Japanese-era years into Gregorian years (e.g. 昭和５６年、令和元年、平成三十一年)

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/year-translation-cropped.png" alt="Screen shot showing translation of 明治四十二年 into 1909年" title="Year translation" width="325">

- Recognition of many more grammatical forms
  (e.g. vs-c verbs like 兼した,
  irregular verbs like いらっしゃいます,
  continuous forms like 食べてた,
  ん as a negative form like 分からん、知らん,
  words with ー like じーちゃん、頑張ろー、そーゆー,
  ぬ verbs,
  とく・どく forms like 買っとく,
  causative passive, させる for verbs ending in す e.g. 起こさせる)
- Automatic preview of name entries when there is a better match in the name dictionary

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/year-translation-cropped.png" alt="Screen shot showing 南硫黄島 being automatically looked up from the names dictionary" title="Name dictionary cross-reference" width="354">

- Handling of a much wider range of characters including ㋕, ㌀, ㋿, 𠏹沢, ８月, Ｂ級グルメ, オーサカ

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/encircled-character-cropped.png" alt="Screen shot showing recognition of 弾道㋯㋚㋑㋸防衛 (弾道ミサイル防衛)" title="Encircled characters" width="443">

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/kabushiki-gaisha-cropped.png" alt="Screen shot showing recognition of ㍿ (株式会社)" title="Composed characters" width="464">

- Completely localized into Japanese (so you can study Japanese while you study Japanese!) and Simplified Chinese

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/localized-cropped.png" alt="Screen shot showing various parts-of-speech and other information translated into Japanese" title="Localized popup" width="277">

- Better prioritization of more common matches
- Support for displaying romaji
- Copy feature that allows selecting which entry and in what format to copy to the clipboard

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/copy-feature-cropped.png" alt="Screen shot showing 魅惑的 being selected and the various formats available for copying" title="Copy feature" width="460">

- Smarter popup positioning
- Support for vertical text and SVG text
- Much lower memory usage (> 90% less)
- Kanji data for Kanji kentei, Conning references, updated educational levels, heavily reworked kanji components etc.

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/kanji-view-cropped.png" alt="Screen shot of kanji view" title="Kanji dictionary" width="389">

- Overhauled settings window to make it more intuitive

  <img src="https://raw.githubusercontent.com/birtles/rikaichamp/main/docs/options-window-cropped.png" alt="Screen shot of options window" title="Options window" width="459">

- Better isolation of styles so that the popup always looks correct
- Improved handling of ruby text in YouTube
- Entirely rewritten with static typing, automated tests, and modern API usage (no sync XHR, XPath etc.)
- Hundreds of other fixes and improvements

## Installing

- [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/rikaichamp/)
- [Chrome Web Store](https://chrome.google.com/webstore/detail/pnmaklegiibbioifkmfkgpfnmdehdfan)
- [Edge Web Store](https://microsoftedge.microsoft.com/addons/detail/rikaichamp-japanese-dicti/cgiogkjpebgfcpcaipiicfeaelpapeig)

## Usage

By default, you can enable Rikaichamp by either:

- Pressing the toolbar button (you may need to add it to the browser toolbar yourself in some browsers)
- Pressing <kbd>Alt</kbd>+<kbd>R</kbd>
- Choosing to enable it from the context menu

Alternatively, a lot of users find it helpful to have Rikaichamp permanently
enabled but configured to only show the pop-up when either <kbd>Alt</kbd> or
<kbd>Ctrl</kbd> is pressed.

The other keys are as follows:

| Action                                    | Key                                                 |
| ----------------------------------------- | --------------------------------------------------- |
| Switch dictionary (words → kanji → names) | <kbd>Shift</kbd> / <kbd>Enter</kbd>                 |
| Toggle display of definitions             | <kbd>d</kbd> _(disabled by default)_                |
| Move the popup up or down                 | <kbd>j</kbd> / <kbd>k</kbd> _(disabled by default)_ |
| Enter copy mode                           | <kbd>c</kbd>                                        |
| (Copy mode) Copy entry                    | <kbd>e</kbd>                                        |
| (Copy mode) Copy tab-separated fields     | <kbd>y</kbd>                                        |
| (Copy mode) Copy word/kanji               | <kbd>w</kbd>                                        |
| (Copy mode) Select next entry             | <kbd>c</kbd>                                        |

## Building a release from source

You may also build the add-ons using a source package from the
[Releases](https://github.com/birtles/rikaichamp/releases) page and running the
following commands:

```
export RELEASE_BUILD=1
yarn install
yarn package:firefox
```

(Note that you may ignore the `.js` files associated with each release.
These are published simply to provide a public URL for each version of the
source files to associating stack traces from error reports.)

The above builds the package for **Firefox**.
Use `yarn package:chrome` to build the Chrome package, or `yarn package:edge` for
Edge.

**Note:** For versions prior to and including 0.5.5 `yarn install` will try to
install `husky` but fail so you will need to run `yarn install --ignore-scripts`.

To build the latest trunk version please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributors

Thank you to everyone who has contributed including the following people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://saltfish.moe/"><img src="https://avatars.githubusercontent.com/u/14184974?v=4?s=100" width="100px;" alt=""/><br /><sub><b>SaltfishAmi</b></sub></a><br /><a href="https://github.com/Brian Birtles/rikaichamp/commits?author=SaltfishAmi" title="Code">💻</a> <a href="#translation-SaltfishAmi" title="Translation">🌍</a></td>
    <td align="center"><a href="https://github.com/claudiofreitas"><img src="https://avatars.githubusercontent.com/u/212832?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Claudio Freitas</b></sub></a><br /><a href="https://github.com/Brian Birtles/rikaichamp/commits?author=claudiofreitas" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Kala-J"><img src="https://avatars.githubusercontent.com/u/47021172?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Kala-J</b></sub></a><br /><a href="https://github.com/Brian Birtles/rikaichamp/commits?author=Kala-J" title="Code">💻</a> <a href="#data-Kala-J" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/ispedals"><img src="https://avatars.githubusercontent.com/u/3164681?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ispedals</b></sub></a><br /><a href="https://github.com/Brian Birtles/rikaichamp/commits?author=ispedals" title="Code">💻</a></td>
    <td align="center"><a href="https://piro.sakura.ne.jp/"><img src="https://avatars.githubusercontent.com/u/70062?v=4?s=100" width="100px;" alt=""/><br /><sub><b>YUKI "Piro" Hiroshi</b></sub></a><br /><a href="#translation-piroor" title="Translation">🌍</a></td>
    <td align="center"><a href="https://github.com/kikaxa"><img src="https://avatars.githubusercontent.com/u/96402?v=4?s=100" width="100px;" alt=""/><br /><sub><b>kikaxa</b></sub></a><br /><a href="https://github.com/Brian Birtles/rikaichamp/commits?author=kikaxa" title="Code">💻</a></td>
    <td align="center"><a href="https://nanaya.pro/"><img src="https://avatars.githubusercontent.com/u/276295?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Edho Arief</b></sub></a><br /><a href="https://github.com/Brian Birtles/rikaichamp/commits?author=nanaya" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://erekspeed.com/"><img src="https://avatars.githubusercontent.com/u/1176550?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Erek Speed</b></sub></a><br /><a href="https://github.com/Brian Birtles/rikaichamp/commits?author=melink14" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions are very welcome!
