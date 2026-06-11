import * as fs from 'node:fs';
import * as url from 'node:url';

// Normalizes the CHANGELOG.md output from `changeset version` to match this
// repo's existing changelog format: remove Changesets' change-type section
// headings, and keep the new release block directly after the Unreleased
// section.
//
// The version heading is deliberately left in its plain `## <version>` form so
// that the Changesets action can locate the new release's section when building
// the release PR body (it matches a heading whose text is exactly the version).
// The Keep a Changelog date is stamped onto the heading later, at release time,
// by `scripts/stamp-changelog-release-date.js`.

const CHANGESET_SECTION_HEADINGS = new Set([
  '### Major Changes',
  '### Minor Changes',
  '### Patch Changes',
]);

/**
 * Rewrites the raw `changeset version` changelog into this repo's flat format:
 * strips the change-type section headings, collapses the release notes into a
 * single contiguous bullet list, and positions the new release block directly
 * after the Unreleased section.
 *
 * @param {{ changeLog: string; version: string }} options
 * @returns {string}
 */
export function postprocessChangelog({ changeLog, version }) {
  const lines = changeLog
    .split(/\r\n|\r|\n/g)
    .filter((line) => !CHANGESET_SECTION_HEADINGS.has(line));
  return `${moveReleaseBlockAfterUnreleased({ lines, version })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;
}

function main() {
  const packageJsonPath = url.fileURLToPath(
    new URL('../package.json', import.meta.url)
  );
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  if (!version) {
    throw new Error('Could not find version in package.json');
  }

  const changeLogPath = url.fileURLToPath(
    new URL('../CHANGELOG.md', import.meta.url)
  );
  const original = fs.readFileSync(changeLogPath, 'utf8');
  const updated = postprocessChangelog({ changeLog: original, version });

  if (updated !== original) {
    fs.writeFileSync(changeLogPath, updated, 'utf8');
  }
}

function moveReleaseBlockAfterUnreleased({ lines, version }) {
  const releaseStart = lines.findIndex((line) =>
    isVersionHeading({ line, version })
  );
  if (releaseStart === -1) {
    return lines;
  }

  const releaseEnd = findReleaseBlockEnd({ lines, releaseStart });
  const releaseBlock = compactReleaseBlock(
    trimBlankLines(lines.slice(releaseStart, releaseEnd))
  );
  const withoutReleaseBlock = [
    ...lines.slice(0, releaseStart),
    ...lines.slice(releaseEnd),
  ];
  const unreleasedIndex = withoutReleaseBlock.findIndex(isUnreleasedHeading);
  if (unreleasedIndex === -1) {
    return lines;
  }

  const nextVersionIndex = withoutReleaseBlock.findIndex(
    (line, index) => index > unreleasedIndex && line.startsWith('## ')
  );
  const insertIndex =
    nextVersionIndex === -1 ? withoutReleaseBlock.length : nextVersionIndex;

  return [
    ...trimTrailingBlankLines(withoutReleaseBlock.slice(0, insertIndex)),
    '',
    ...releaseBlock,
    '',
    ...trimLeadingBlankLines(withoutReleaseBlock.slice(insertIndex)),
  ];
}

// Collapses a release block into the repo's flat format: the version heading,
// one blank line, then the release notes as a single contiguous bullet list.
//
// Notes within a single change-type section are already adjacent (see
// `.changeset/changelog.ts`), but `changeset version` emits each change type as
// its own `### … Changes` section. Once those headings are stripped, a release
// spanning multiple change types leaves a blank line where the section boundary
// used to be, so the raw block looks like:
//
//   ## 1.28.0
//
//   - A minor note
//
//   - A patch note
//
// Dropping the interior blank lines merges the sections into one list, matching
// every other entry in CHANGELOG.md. Indented continuation lines of a
// multi-line note are non-blank, so they are preserved.
function compactReleaseBlock(block) {
  const [heading, ...rest] = block;
  if (heading === undefined) {
    return block;
  }
  const notes = rest.filter((line) => line.trim());
  return notes.length ? [heading, '', ...notes] : [heading];
}

function findReleaseBlockEnd({ lines, releaseStart }) {
  let sawReleaseNote = false;
  for (let index = releaseStart + 1; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith('## ')) {
      return trimReleaseBlockEnd({ lines, releaseStart, releaseEnd: index });
    }

    if (!line.trim()) {
      continue;
    }

    if (line.startsWith('- ') || /^\s+/.test(line)) {
      sawReleaseNote = true;
      continue;
    }

    if (sawReleaseNote) {
      return trimReleaseBlockEnd({ lines, releaseStart, releaseEnd: index });
    }
  }

  return trimReleaseBlockEnd({ lines, releaseStart, releaseEnd: lines.length });
}

function trimReleaseBlockEnd({ lines, releaseStart, releaseEnd }) {
  while (releaseEnd > releaseStart && !lines[releaseEnd - 1].trim()) {
    releaseEnd--;
  }
  return releaseEnd;
}

function isVersionHeading({ line, version }) {
  // `changeset version` emits a plain `## <version>` heading; the date is added
  // later at release time.
  return new RegExp(`^## ${escapeRegExp(version)}\\s*$`).test(line);
}

function isUnreleasedHeading(line) {
  return /^##\s+(?:\[Unreleased\]|Unreleased)\s*$/.test(line);
}

function trimBlankLines(lines) {
  return trimLeadingBlankLines(trimTrailingBlankLines(lines));
}

function trimLeadingBlankLines(lines) {
  let start = 0;
  while (start < lines.length && !lines[start].trim()) {
    start++;
  }
  return lines.slice(start);
}

function trimTrailingBlankLines(lines) {
  let end = lines.length;
  while (end > 0 && !lines[end - 1].trim()) {
    end--;
  }
  return lines.slice(0, end);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Only run the CLI when invoked directly (not when imported by tests).
if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
