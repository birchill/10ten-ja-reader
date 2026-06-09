import { describe, expect, it } from 'vitest';

import { stampChangelogReleaseDate } from './stamp-changelog-release-date.js';

const CHANGELOG = `# Changelog

## [Unreleased]

## 1.28.0

- Point 1
- Point 2

## [1.27.3] - 2026-06-08

- Earlier point
`;

describe('stampChangelogReleaseDate', () => {
  it('stamps the date onto the plain version heading', () => {
    const result = stampChangelogReleaseDate({
      changeLog: CHANGELOG,
      version: '1.28.0',
      date: '2026-06-08',
    });

    expect(result).toContain('## [1.28.0] - 2026-06-08\n');
    expect(result).not.toContain('## 1.28.0\n');
  });

  it('leaves already-dated headings of other versions untouched', () => {
    const result = stampChangelogReleaseDate({
      changeLog: CHANGELOG,
      version: '1.28.0',
      date: '2026-06-08',
    });

    expect(result).toContain('## [1.27.3] - 2026-06-08\n');
  });

  it('does not add an annotation when the release targets all browsers', () => {
    const result = stampChangelogReleaseDate({
      changeLog: CHANGELOG,
      version: '1.28.0',
      date: '2026-06-08',
    });

    expect(result).toContain('## [1.28.0] - 2026-06-08\n');
  });

  it('derives a target annotation when every note is browser-restricted', () => {
    const changeLog = `# Changelog

## 1.28.0

- (Firefox, Thunderbird) Fixed generation of source artifacts.

## [1.27.3] - 2026-06-08

- Earlier point
`;

    const result = stampChangelogReleaseDate({
      changeLog,
      version: '1.28.0',
      date: '2026-06-08',
    });

    expect(result).toContain(
      '## [1.28.0] - 2026-06-08 (Firefox, Thunderbird only)\n'
    );
  });

  it('is a no-op when the heading is already stamped', () => {
    const changeLog = `# Changelog

## [1.28.0] - 2026-06-08

- Point 1
`;

    const result = stampChangelogReleaseDate({
      changeLog,
      version: '1.28.0',
      date: '2026-06-09',
    });

    expect(result).toBe(changeLog);
  });
});
