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
  const lines = original
    .split(/\r\n|\r|\n/g)
    .filter((line) => !CHANGESET_SECTION_HEADINGS.has(line));
  const updated = `${moveReleaseBlockAfterUnreleased({ lines, version })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;

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
  const releaseBlock = trimBlankLines(lines.slice(releaseStart, releaseEnd));
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

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
