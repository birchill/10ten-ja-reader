import { describe, expect, it } from 'vitest';

import { postprocessChangelog } from './postprocess-changeset-changelog.js';

// `changeset version` writes the new release with each change type under its own
// `### … Changes` section; notes within a section are adjacent (see
// `.changeset/changelog.ts`). These fixtures reproduce that raw output so we can
// assert how it gets normalized into the repo's flat format.

describe('postprocessChangelog', () => {
  it('strips the change-type heading and keeps the version heading', () => {
    const changeLog = `# Changelog

## [Unreleased]

## 1.28.0
### Minor Changes

- Only note
`;

    const result = postprocessChangelog({ changeLog, version: '1.28.0' });

    expect(result).not.toContain('### Minor Changes');
    expect(result).toContain('## 1.28.0\n\n- Only note\n');
  });

  it('keeps notes within a section adjacent', () => {
    const changeLog = `# Changelog

## [Unreleased]

## 1.28.0
### Minor Changes

- First note
- Second note ([#2958](https://example/2958)).

## [1.27.2] - 2026-05-08

- Earlier point
`;

    const result = postprocessChangelog({ changeLog, version: '1.28.0' });

    expect(result).toContain(
      '## 1.28.0\n\n- First note\n- Second note ([#2958](https://example/2958)).\n'
    );
  });

  it('merges multiple change-type sections into one flat bullet list', () => {
    // The reason compaction is still needed: stripping the section headings
    // would otherwise leave a blank line where the boundary used to be.
    const changeLog = `# Changelog

## [Unreleased]

## 1.29.0
### Minor Changes

- A minor note

### Patch Changes

- A patch note
`;

    const result = postprocessChangelog({ changeLog, version: '1.29.0' });

    expect(result).toContain('## 1.29.0\n\n- A minor note\n- A patch note\n');
    expect(result).not.toContain('### Patch Changes');
    expect(result).not.toMatch(/- A minor note\n\n- A patch note/);
  });

  it('preserves indented continuation lines of multi-line notes', () => {
    const changeLog = `# Changelog

## [Unreleased]

## 1.29.0
### Minor Changes

- Added support for X
  ([#123](https://example/123)).
- Second note
`;

    const result = postprocessChangelog({ changeLog, version: '1.29.0' });

    expect(result).toContain(
      '## 1.29.0\n\n- Added support for X\n  ([#123](https://example/123)).\n- Second note\n'
    );
  });

  it('is robust to stray blank lines between notes', () => {
    // Defensive: even if a future changelog formatter (or config change) spaces
    // notes out with blank lines, the flat format must still hold.
    const changeLog = `# Changelog

## [Unreleased]

## 1.28.0
### Minor Changes



- First note


- Second note
`;

    const result = postprocessChangelog({ changeLog, version: '1.28.0' });

    expect(result).toContain('## 1.28.0\n\n- First note\n- Second note\n');
    expect(result).not.toMatch(/- First note\n\n- Second note/);
  });

  it('moves the release block to directly after the Unreleased section', () => {
    // `changeset version` appends the new block; it must end up above older ones.
    const changeLog = `# Changelog

## [Unreleased]

## [1.27.2] - 2026-05-08

- Earlier point

## 1.28.0
### Minor Changes

- New note
`;

    const result = postprocessChangelog({ changeLog, version: '1.28.0' });

    const unreleasedIndex = result.indexOf('## [Unreleased]');
    const newReleaseIndex = result.indexOf('## 1.28.0');
    const olderIndex = result.indexOf('## [1.27.2]');
    expect(unreleasedIndex).toBeLessThan(newReleaseIndex);
    expect(newReleaseIndex).toBeLessThan(olderIndex);
  });

  it('ends with a single trailing newline', () => {
    const changeLog = `# Changelog

## [Unreleased]

## 1.28.0
### Minor Changes

- Note
`;

    const result = postprocessChangelog({ changeLog, version: '1.28.0' });

    expect(result.endsWith('- Note\n')).toBe(true);
    expect(result.endsWith('\n\n')).toBe(false);
  });
});
