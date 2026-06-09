import { describe, expect, it } from 'vitest';

import { formatReleaseNotes, getReleaseTargets } from './format-release-notes';

describe('formatReleaseNotes', () => {
  it('fetches the matching set of notes', () => {
    expect(
      formatReleaseNotes({
        changeLog: `# Changelog

All notable changes to this project will be documented in this file.

The format is based roughly on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project does _not_ adhere to semantic versioning—it's a consumer
app.

## [Unreleased]

- Point 1
- Point 2

## [1.7.2] - 2022-02-10

(Nothing to see here)

## [1.7.1] - 2022-02-10

- Fixed display of the radical meaning in kanji view.
- Fixed text look up for Google docs when the document is scaled.

## [1.7.0] - 2022-02-05

- Point 1

[unreleased]: https://github.com/birchill/10ten-ja-reader/compare/v1.7.2...HEAD
[1.7.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.7.2...v1.7.1
[1.7.1]: https://github.com/birchill/10ten-ja-reader/compare/v1.7.1...v1.7.0
[1.7.0]: https://github.com/birchill/10ten-ja-reader/releases/tag/v1.7.0
    `,
        version: '1.7.1',
      })
    ).toEqual(`- Fixed display of the radical meaning in kanji view.
- Fixed text look up for Google docs when the document is scaled.

<!--
Firefox:
• Fixed display of the radical meaning in kanji view.
• Fixed text look up for Google docs when the document is scaled.

Chrome:
• Fixed display of the radical meaning in kanji view.
• Fixed text look up for Google docs when the document is scaled.

Edge:
• Fixed display of the radical meaning in kanji view.
• Fixed text look up for Google docs when the document is scaled.

Safari:
• Fixed display of the radical meaning in kanji view.
• Fixed text look up for Google docs when the document is scaled.

Thunderbird:
• Fixed display of the radical meaning in kanji view.
• Fixed text look up for Google docs when the document is scaled.
-->`);
  });

  it('handles a Changesets-style version heading', () => {
    expect(
      formatReleaseNotes({
        changeLog: `
## 1.7.1

- Fixed display of the radical meaning in kanji view.
    `,
        version: '1.7.1',
      })
    ).toEqual(`- Fixed display of the radical meaning in kanji view.

<!--
Firefox:
• Fixed display of the radical meaning in kanji view.

Chrome:
• Fixed display of the radical meaning in kanji view.

Edge:
• Fixed display of the radical meaning in kanji view.

Safari:
• Fixed display of the radical meaning in kanji view.

Thunderbird:
• Fixed display of the radical meaning in kanji view.
-->`);
  });

  it('does not match another version with the requested version as a prefix', () => {
    const notes = formatReleaseNotes({
      changeLog: `
## 1.7.10

- Wrong release.

## 1.7.1

- Right release.
    `,
      version: '1.7.1',
    });

    expect(notes).toContain('- Right release.');
    expect(notes).not.toContain('- Wrong release.');
  });

  it('matches version headings with punctuation and loose dates, ignoring any trailing annotation', () => {
    const notes = formatReleaseNotes({
      changeLog: `
## [1.7.1+test] - 2022-2-10 (Firefox only)

- Fixed display of the radical meaning in kanji view.
    `,
      version: '1.7.1+test',
    });

    // The heading is still located despite the punctuation and non-normalized
    // date, but the trailing annotation is no longer honoured: an unannotated
    // note applies to every browser.
    expect(notes).toContain('Firefox:');
    expect(notes).toContain('Chrome:');
  });

  it('merges bullet points that are split across lines', () => {
    expect(
      formatReleaseNotes({
        changeLog: `
## [1.7.1] - 2022-02-10

- Fixed a regression where non-Firefox browsers could not look up the first
  character in a text box
  [#725](https://github.com/birchill/10ten-ja-reader/issues/725)).
  - Just to make things interesting, we also go for a nested bullet
    point.
- Fixed text look up for Google docs when the document is
  scaled.
    `,
        version: '1.7.1',
      })
    )
      .toEqual(`- Fixed a regression where non-Firefox browsers could not look up the first character in a text box [#725](https://github.com/birchill/10ten-ja-reader/issues/725)).
  - Just to make things interesting, we also go for a nested bullet point.
- Fixed text look up for Google docs when the document is scaled.

<!--
Firefox:
• Fixed a regression where non-Firefox browsers could not look up the first character in a text box.
  ◦ Just to make things interesting, we also go for a nested bullet point.
• Fixed text look up for Google docs when the document is scaled.

Chrome:
• Fixed a regression where non-Firefox browsers could not look up the first character in a text box.
  ◦ Just to make things interesting, we also go for a nested bullet point.
• Fixed text look up for Google docs when the document is scaled.

Edge:
• Fixed a regression where non-Firefox browsers could not look up the first character in a text box.
  ◦ Just to make things interesting, we also go for a nested bullet point.
• Fixed text look up for Google docs when the document is scaled.

Safari:
• Fixed a regression where non-Firefox browsers could not look up the first character in a text box.
  ◦ Just to make things interesting, we also go for a nested bullet point.
• Fixed text look up for Google docs when the document is scaled.

Thunderbird:
• Fixed a regression where non-Firefox browsers could not look up the first character in a text box.
  ◦ Just to make things interesting, we also go for a nested bullet point.
• Fixed text look up for Google docs when the document is scaled.
-->`);
  });

  it('generates browser-specific release notes', () => {
    expect(
      formatReleaseNotes({
        changeLog: `
## [1.7.1] - 2022-02-10

- Release note with an issue number ([#725](https://github.com/birchill/10ten-ja-reader/issues/725)).
- Release note with an attribution thanks to [@yer](https://github.com/yer)
- Release note with an issue number and an
  attribution thanks to [@yer](https://github.com/yer)
  ([#725](https://github.com/birchill/10ten-ja-reader/issues/725)).
- (Firefox) Firefox-only item
  - Sub-item
- (Chrome, Safari) Chrome and Safari-only item
- (edge,random) Edge point
- (Bonus!) New feature!
- Added keyboard shortcut <kbd>Ctrl</kbd>+<kbd>A</kbd>!
    `,
        version: '1.7.1',
      })
    )
      .toEqual(`- Release note with an issue number ([#725](https://github.com/birchill/10ten-ja-reader/issues/725)).
- Release note with an attribution thanks to [@yer](https://github.com/yer)
- Release note with an issue number and an attribution thanks to [@yer](https://github.com/yer) ([#725](https://github.com/birchill/10ten-ja-reader/issues/725)).
- (Firefox) Firefox-only item
  - Sub-item
- (Chrome, Safari) Chrome and Safari-only item
- (edge,random) Edge point
- (Bonus!) New feature!
- Added keyboard shortcut <kbd>Ctrl</kbd>+<kbd>A</kbd>!

<!--
Firefox:
• Release note with an issue number.
• Release note with an attribution
• Release note with an issue number and an attribution.
• Firefox-only item
  ◦ Sub-item
• (Bonus!) New feature!
• Added keyboard shortcut Ctrl+A!

Chrome:
• Release note with an issue number.
• Release note with an attribution
• Release note with an issue number and an attribution.
• Chrome and Safari-only item
• (Bonus!) New feature!
• Added keyboard shortcut Ctrl+A!

Edge:
• Release note with an issue number.
• Release note with an attribution
• Release note with an issue number and an attribution.
• Edge point
• (Bonus!) New feature!
• Added keyboard shortcut Ctrl+A!

Safari:
• Release note with an issue number.
• Release note with an attribution
• Release note with an issue number and an attribution.
• Chrome and Safari-only item
• (Bonus!) New feature!
• Added keyboard shortcut Ctrl+A!

Thunderbird:
• Release note with an issue number.
• Release note with an attribution
• Release note with an issue number and an attribution.
• (Bonus!) New feature!
• Added keyboard shortcut Ctrl+A!
-->`);
  });

  it('omits browsers that have no applicable notes', () => {
    expect(
      formatReleaseNotes({
        changeLog: `## [1.7.2] - 2022-02-10

- (Firefox) Fixed display of the radical meaning in kanji view.
- (Firefox) Fixed text look up for Google docs when the document is scaled.

## [1.7.0] - 2022-02-05

- Point 1`,
        version: '1.7.2',
      })
    ).toEqual(`- (Firefox) Fixed display of the radical meaning in kanji view.
- (Firefox) Fixed text look up for Google docs when the document is scaled.

<!--
Firefox:
• Fixed display of the radical meaning in kanji view.
• Fixed text look up for Google docs when the document is scaled.
-->`);
  });
});

describe('getReleaseTargets', () => {
  it('returns all browsers when notes are unannotated', () => {
    expect(
      getReleaseTargets({
        changeLog: `
## 1.7.1

- A general fix.
`,
        version: '1.7.1',
      })
    ).toEqual(['Firefox', 'Chrome', 'Edge', 'Safari', 'Thunderbird']);
  });

  it('returns only the targeted browsers when every note is restricted', () => {
    expect(
      getReleaseTargets({
        changeLog: `
## 1.7.1

- (Firefox, Thunderbird) Fixed generation of source artifacts.
`,
        version: '1.7.1',
      })
    ).toEqual(['Firefox', 'Thunderbird']);
  });

  it('returns all browsers when at least one note is unannotated', () => {
    expect(
      getReleaseTargets({
        changeLog: `
## 1.7.1

- (Firefox) A Firefox-only fix.
- A general fix.
`,
        version: '1.7.1',
      })
    ).toEqual(['Firefox', 'Chrome', 'Edge', 'Safari', 'Thunderbird']);
  });
});
