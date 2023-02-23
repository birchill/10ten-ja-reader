<div align="center">
  <img src="images/10ten-ja-reader.svg" alt="10ten Japanese Reader" width="200" height="200" />
  <h1>10ten Japanese Reader</h1>

  <p>
    Hi fellow Japanese reader! Formerly known as Rikaichamp, this browser extension lets you look up Japanese words with the hover of a mouse or tap of a screen. 
  </p>

  <p>
    <a href="https://twitter.com/10tenstudy"><img src="https://img.shields.io/twitter/follow/10tenstudy" alt="Follow @10tenstudy"></a>
    <a href=""><img src="https://github.com/birchill/10ten-ja-reader/workflows/Automated%20tests/badge.svg" alt="automated test status" /></a>
  </p>
</div>

## Table of Contents

- [Installing](#installing)
- [Features](#features)
- [Usage](#usage)
- [Building from source](#building-from-source)
- [Contributing](#contributing)
- [Contributors](#contributors)

## Installing

- [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/10ten-ja-reader/)
- [Chrome Web Store](https://chrome.google.com/webstore/detail/pnmaklegiibbioifkmfkgpfnmdehdfan)
- [Edge Web Store](https://microsoftedge.microsoft.com/addons/detail/cgiogkjpebgfcpcaipiicfeaelpapeig)
- [App Store](https://apps.apple.com/app/10ten-japanese-reader/id1573540634) (Safari)
- [Thunderbird](https://addons.thunderbird.net/thunderbird/addon/10ten-ja-reader/)

## Features

- Pitch accent information

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/pitch-accent-cropped.png" alt="Screenshot showing pitch accent information" title="Pitch accent information" width="640">

- Support for non-English dictionaries

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/german-cropped.png" alt="Screenshot showing German translation" title="German translation" width="640">

- Dictionaries that update automatically twice a week by fetching just the updated entries
- Easy to read dictionary entries

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/word-display-cropped.png" alt="Screenshot showing how definitions are grouped by part-of-speech" title="Some of the features of word display" width="640">

- Automatic translation of Japanese-era years into Gregorian years (e.g. 昭和５６年、令和元年、平成三十一年)

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/year-translation-cropped.png" alt="Screenshot showing translation of 明治四十二年 into 1909年" title="Year translation" width="640">

- Automatic translation between 畳/帖 measurements and square meters (e.g. 四畳半、12.6 帖、25 平米、6m<sup>2</sup>)

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/jou-conversion-cropped.png" alt="Screenshot showing translation of 四畳半 into 7.29 square meters" title="Area translation" width="640">

- Recognition of a wide range of grammatical forms
  (e.g. vs-c verbs like 兼した,
  irregular verbs like いらっしゃいます,
  continuous forms like 食べてた,
  ん as a negative form like 分からん、知らん,
  words with ー like じーちゃん、頑張ろー、そーゆー,
  ぬ verbs,
  とく・どく forms like 買っとく,
  causative passive, させる for verbs ending in す e.g. 起こさせる)
- Automatic preview of name entries when there is a better match in the name dictionary

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/name-dictionary-cross-ref-cropped.png" alt="Screenshot showing 小池百合子 being automatically looked up from the names dictionary" title="Name dictionary cross-reference" width="640">

- Handling of a wide range of characters including ㋕, ㌀, ㋿, 𠏹沢, ８月, Ｂ級グルメ, オーサカ

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/encircled-character-cropped.png" alt="Screenshot showing recognition of 弾道㋯㋚㋑㋸防衛 (弾道ミサイル防衛)" title="Encircled characters" width="640">

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/kabushiki-gaisha-cropped.png" alt="Screenshot showing recognition of ㍿ (株式会社)" title="Composed characters" width="640">

- Localized into Japanese (so you can study Japanese while you study Japanese!) and Simplified Chinese

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/localized-cropped.png" alt="Screenshot showing various parts-of-speech and other information translated into Japanese" title="Localized popup" width="640">

- Prioritization of common matches
- Support for displaying romaji
- Copy feature that allows selecting which entry and in what format to copy to the clipboard

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/copy-feature-cropped.png" alt="Screenshot showing 河川敷 being selected and the various formats available for copying" title="Copy feature" width="640">

- Smart popup positioning
- Support for vertical text and text in SVG images
- Minimal memory usage
- Kanji data for Kanji kentei, Conning references, updated educational levels, heavily reworked kanji components etc.

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/kanji-view.png" alt="Screenshot of kanji view" title="Kanji dictionary" width="640">

- Intuitive settings window

  <img src="https://raw.githubusercontent.com/birchill/10ten-ja-reader/main/docs/options-window-cropped-more.png" alt="Screenshot of options window" title="Options window" width="401">

- Isolation of styles so that the popup always looks correct
- Handling of ruby text in YouTube

## Usage

By default, you can enable the 10ten Japanese Reader by either:

- Pressing the toolbar button (you may need to add it to the browser toolbar yourself in some browsers)
- Pressing <kbd>Alt</kbd>+<kbd>R</kbd>
- Choosing to enable it from the context menu

Alternatively, a lot of users find it helpful to have the extension permanently
enabled but configured to only show the pop-up when either <kbd>Alt</kbd> or
<kbd>Ctrl</kbd> is pressed.

The other keys are as follows:

| Action                                    | Key                                                 |
| ----------------------------------------- | --------------------------------------------------- |
| Switch dictionary (words → kanji → names) | <kbd>Shift</kbd> / <kbd>Enter</kbd>                 |
| Show kanji results only                   | <kbd>Shift</kbd> _(disabled by default)_            |
| Toggle display of definitions             | <kbd>d</kbd> _(disabled by default)_                |
| Move the popup up or down                 | <kbd>j</kbd> / <kbd>k</kbd> _(disabled by default)_ |
| Enter copy mode                           | <kbd>c</kbd>                                        |
| (Copy mode) Copy entry                    | <kbd>e</kbd>                                        |
| (Copy mode) Copy tab-separated fields     | <kbd>y</kbd>                                        |
| (Copy mode) Copy word/kanji               | <kbd>w</kbd>                                        |
| (Copy mode) Select next entry             | <kbd>c</kbd>                                        |

## Building a release from source

You may also build the add-ons using a source package from the
[Releases](https://github.com/birchill/10ten-ja-reader/releases) page and running the
following commands:

```
export RELEASE_BUILD=1
yarn install
yarn package:firefox # Or `yarn package` for versions 0.5.8 and earlier
```

(Note that you may ignore the `.js` files associated with each release.
These are published simply to provide a public URL for each version of the
source files to associating stack traces from error reports.)

The above builds the package for **Firefox**.
Use `yarn package:chrome` to build the Chrome package, `yarn package:edge` for
Edge, `yarn package:safari` for Safari, or `yarn package:thunderbird` for
Thunderbird.

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
    <td align="center"><a href="https://saltfish.moe/"><img src="https://avatars.githubusercontent.com/u/14184974?v=4?s=100" width="100px;" alt=""/><br /><sub><b>SaltfishAmi</b></sub></a><br /><a href="https://github.com/birchill/10ten-ja-reader/commits?author=SaltfishAmi" title="Code">💻</a> <a href="#translation-SaltfishAmi" title="Translation">🌍</a></td>
    <td align="center"><a href="https://github.com/claudiofreitas"><img src="https://avatars.githubusercontent.com/u/212832?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Claudio Freitas</b></sub></a><br /><a href="https://github.com/birchill/10ten-ja-reader/commits?author=claudiofreitas" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Kala-J"><img src="https://avatars.githubusercontent.com/u/47021172?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Kala-J</b></sub></a><br /><a href="https://github.com/birchill/10ten-ja-reader/commits?author=Kala-J" title="Code">💻</a> <a href="#data-Kala-J" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/ispedals"><img src="https://avatars.githubusercontent.com/u/3164681?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ispedals</b></sub></a><br /><a href="https://github.com/birchill/10ten-ja-reader/commits?author=ispedals" title="Code">💻</a></td>
    <td align="center"><a href="https://piro.sakura.ne.jp/"><img src="https://avatars.githubusercontent.com/u/70062?v=4?s=100" width="100px;" alt=""/><br /><sub><b>YUKI "Piro" Hiroshi</b></sub></a><br /><a href="#translation-piroor" title="Translation">🌍</a></td>
    <td align="center"><a href="https://github.com/kikaxa"><img src="https://avatars.githubusercontent.com/u/96402?v=4?s=100" width="100px;" alt=""/><br /><sub><b>kikaxa</b></sub></a><br /><a href="https://github.com/birchill/10ten-ja-reader/commits?author=kikaxa" title="Code">💻</a></td>
    <td align="center"><a href="https://nanaya.pro/"><img src="https://avatars.githubusercontent.com/u/276295?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Edho Arief</b></sub></a><br /><a href="https://github.com/birchill/10ten-ja-reader/commits?author=nanaya" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://erekspeed.com/"><img src="https://avatars.githubusercontent.com/u/1176550?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Erek Speed</b></sub></a><br /><a href="https://github.com/birchill/10ten-ja-reader/commits?author=melink14" title="Code">💻</a></td>
    <td align="center"><a href="https://birchlabs.co.uk/"><img src="https://avatars.githubusercontent.com/u/14055146?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jamie Birch</b></sub></a><br /><a href="https://github.com/birchill/10ten-ja-reader/commits?author=shirakaba" title="Code">💻</a> <a href="#ideas-shirakaba" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/birchill/10ten-ja-reader/issues?q=author%3Ashirakaba" title="Bug reports">🐛</a> <a href="#platform-shirakaba" title="Packaging/porting to new platform">📦</a></td>
    <td align="center"><a href="http://stackoverflow.com/users/18771/tomalak"><img src="https://avatars.githubusercontent.com/u/28300?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Martin Böhm</b></sub></a><br /><a href="https://github.com/birchill/10ten-ja-reader/issues?q=author%3ATomalak" title="Bug reports">🐛</a> <a href="#ideas-Tomalak" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/nicolasmaia"><img src="https://avatars.githubusercontent.com/u/23157217?v=4?s=100" width="100px;" alt=""/><br /><sub><b>nicolasmaia</b></sub></a><br /><a href="https://github.com/birchill/10ten-ja-reader/issues?q=author%3Anicolasmaia" title="Bug reports">🐛</a> <a href="#ideas-nicolasmaia" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions are very welcome!
