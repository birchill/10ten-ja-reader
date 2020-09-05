# Changelog

Starting with 1.0.0 rikaikun uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) to
consistently version releases as follows:

- Major: Minimum required chrome version advances.
- Minor: New user visible feature added. (contains feat commits)
- Patch: Bug fix to previous feature. (contains only fix commits)

## [1.0.0](https://github.com/melink14/rikaikun/compare/v0.10.1...v1.0.0) (2020-09-01)

### Features

- **dict:** Handle 'meanings' that contain curly braces. ([47cd179](https://github.com/melink14/rikaikun/commit/47cd179d6d1461f7162cb24184e613f33ca08973)), closes [#191](https://github.com/melink14/rikaikun/issues/191)
- **dict:** Update word and name dictionaries to 2020-08-31 snapshots. ([4801377](https://github.com/melink14/rikaikun/commit/4801377fd265356dab087c28dfc54697be336a02)), closes [#49](https://github.com/melink14/rikaikun/issues/49)

### Bug Fixes

- **ui:** Don't trigger 'copy' command if Mac CMD key is also held down. ([63e409f](https://github.com/melink14/rikaikun/commit/63e409fa6b1cd61273c214bcf47cf1ec250ed680)), closes [#178](https://github.com/melink14/rikaikun/issues/178)
- **ui:** Add `lang="ja"` to rikaikun content HTML so that Chrome uses Japanese fonts to render it always ([ef48b7c](https://github.com/melink14/rikaikun/commit/ef48b7c954a5af78e9a3cac1245c5e014e3d7d84)), closes [#220](https://github.com/melink14/rikaikun/issues/220)

## [0.10.1](https://github.com/melink14/rikaikun/compare/v0.10.0...v0.10.1) (2019-09-24)

### Bug Fixes

- Fix bug where unchecked values for kanji dictionary info would not persist between extension restarts.

## [0.10.0](https://github.com/melink14/rikaikun/compare/v0.9.1...v0.10.0) (2019-09-23)

### Features

- Scrolling to see >7 dictionary entries by bazzinotti.
- Add Heisig keywords to Kanji dictionary by Vwing.
- Add Heisig 6th edition by Vwing.
- Add Text To Speech support (enable in settings) by MayamaTakeshi.
- Options appear in pop up instead of new page by darren-lester.
- Settings use cloud sync and persist across all computers by Deshaun Crawford.

### Bug Fixes

- CTRL-C works properly to copy just the word instead of copying the full definition by darren-lester.
- Google Docs mostly works again after they updated their rendering logic.

## [0.9.1](https://github.com/melink14/rikaikun/compare/v0.9.0...v0.9.1) (2018-03-05)

### Bug Fixes

- Fixes textarea bug.

## [0.9.0](https://github.com/melink14/rikaikun/compare/v0.8.6...v0.9.0) (2018-03-04)

Versions weren't tracked closely for the 5 years before this so they're combined at 0.9.0

### Features

- Add names dictionary. (sepharad)
- Faster dictionary loading. (JakeH, darren-lester)
- Popup delay added and popups can be configured to only show up when a key is pressed. (Versus)
- Popup location default can be configured via options. (Tobi Owoputi)

### Bug Fixes

- Various bug fixes.

## 0.8.91

jQuery was removed and a bug common on angular pages.

## 0.8.9

Names dictionary is added. It's quite large but shouldn't be a problem for modern computers.

## 0.8.7

Fixed bug where rikaikun would stop working and need to be turned off and on again.

## 0.8.6

Added readings only mode that can be turned on in the options.
It allows you to not see English definitions if you don't want to.

## 0.8.5

Fixed various bugs. Added text fields and button capability. By default, it doesn't highlight words in text fields but you can turn it on in the options.

## 0.8.1

Small bug fix and improved options screen. Still only has 2 options, but looks nice.

## 0.8

Fixed a few instances where rikaikun wouldn't detect the beginning of a word.
Changed icons.
