# Changelog

Starting with 1.0.0 rikaikun uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) to
consistently version releases as follows:

- Major: Minimum required chrome version advances.
- Minor: New user visible feature added. (contains feat commits)
- Patch: Bug fix to previous feature. (contains only fix commits)

### [1.2.1](https://github.com/melink14/rikaikun/compare/v1.2.0...v1.2.1) (2021-05-24)

### Bug Fixes

- **dict:** Update dictionaries to latest versions. ([#508](https://github.com/melink14/rikaikun/issues/508)) ([0ab6f36](https://github.com/melink14/rikaikun/commit/0ab6f36db80d20e09228c2865c88594476d7e620))

## [1.2.0](https://github.com/melink14/rikaikun/compare/v1.1.0...v1.2.0) (2021-05-17)

### Features

- **dict:** Update dictionaries to latest versions. ([#484](https://github.com/melink14/rikaikun/issues/484)) ([1185e74](https://github.com/melink14/rikaikun/commit/1185e74d5181a0469dd2c74b513351edbb2bbf1b))
- **options:** Improve options rendering and saving ([#480](https://github.com/melink14/rikaikun/issues/480)) ([0d601ae](https://github.com/melink14/rikaikun/commit/0d601ae9254edb300f890b01bbc5a106ce06e6bf)), closes [#164](https://github.com/melink14/rikaikun/issues/164)

## [1.1.0](https://github.com/melink14/rikaikun/compare/v1.0.0...v1.1.0) (2021-05-11)

### Features

- **dict:** Update dictionaries ([#451](https://github.com/melink14/rikaikun/issues/451)) ([97e6306](https://github.com/melink14/rikaikun/commit/97e6306a7faabfe2e42f16566c56a768478683df))
- **dict:** Update dictionaries to latest versions. ([#469](https://github.com/melink14/rikaikun/issues/469)) ([96a6032](https://github.com/melink14/rikaikun/commit/96a6032b445181033f17855ce28274e72e180e5c))

### Bug Fixes

- **manifest:** Edit the manifest description to fit under the character limit ([de5a21a](https://github.com/melink14/rikaikun/commit/de5a21a3a4b05aded0e4e1a13b7943f02ae09f8c))
- Change manifest.json description to be more descriptive. ([#268](https://github.com/melink14/rikaikun/issues/268)) ([5fb116c](https://github.com/melink14/rikaikun/commit/5fb116c8427c479e926f16250a7bedf858b29890)), closes [#245](https://github.com/melink14/rikaikun/issues/245)
- Falsy setting values now correctly initialize. ([#408](https://github.com/melink14/rikaikun/issues/408)) ([327eecd](https://github.com/melink14/rikaikun/commit/327eecdb40c06dbd48784d50e0dee1e03f00bc85)), closes [#346](https://github.com/melink14/rikaikun/issues/346)
- Migrate `onSelectionChanged` to `onActivated` ([#461](https://github.com/melink14/rikaikun/issues/461)) ([d8a0a9d](https://github.com/melink14/rikaikun/commit/d8a0a9dd73f46b914554a3fd1f7afa671cbae8a6)), closes [#153](https://github.com/melink14/rikaikun/issues/153)
- Remove unneeded tabs permission from manifest. ([#266](https://github.com/melink14/rikaikun/issues/266)) ([d529e62](https://github.com/melink14/rikaikun/commit/d529e624fdbbd7b0f8c250fc2396ac30efddec07)), closes [#152](https://github.com/melink14/rikaikun/issues/152)
- Reset badge text to empty on extension startup ([#462](https://github.com/melink14/rikaikun/issues/462)) ([b4afd3f](https://github.com/melink14/rikaikun/commit/b4afd3fa07116c9900575aefae2dae7b9065f6d9)), closes [#82](https://github.com/melink14/rikaikun/issues/82)
- Update manifest.json to allow rikaikun to work in srcdoc iframes. ([#411](https://github.com/melink14/rikaikun/issues/411)) ([093824b](https://github.com/melink14/rikaikun/commit/093824b15cc8e792c01541ae1fa40a1355b28d2f)), closes [#410](https://github.com/melink14/rikaikun/issues/410)

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
