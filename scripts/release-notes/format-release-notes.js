/**
 * Returns the release notes for the given version.
 *
 * @param {{ changeLog: string; version: string }} options
 * @returns {string}
 */
export function formatReleaseNotes({ changeLog, version }) {
  // Get the lines of the changelog for the specified version
  const lines = changeLog.split(/\r\n|\r|\n/g);
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start === -1) {
    throw new Error(`Could not find release notes for version ${version}`);
  }

  // Parse out any annotation on the version number restricting the set of
  // included browsers.
  const versionAnnotation = lines[start].match(/\s+\((.+)\)/);
  let supportedBrowsers = null;
  if (versionAnnotation) {
    supportedBrowsers = getSupportedBrowsers(versionAnnotation[1]);
  }

  // Look for the next version or the references section at the end
  let len = lines
    .slice(start + 1)
    .findIndex((line) => line.startsWith('##') || line.startsWith('['));
  if (len === -1) {
    // Extract to the end of the file
    len = undefined;
  }

  // Extract the initial release notes body
  let notes = lines
    .slice(start + 1, len ? start + len : undefined)
    .join('\n')
    .trim();

  // Merge line-wrapped bullet points
  //
  // For some reason, GitHub allows bullet points to be broken across lines in
  // regular markdown like `README.md` etc. but for the markdown used in release
  // notes it doesn't.
  //
  // (To whoever has to maintain this, I'm sorry.)
  notes = notes.replaceAll(/(?<=^\s*- [\s\S]*?)\n\s*(?=[^-\s])/gm, ' ');

  // Generate human-friendly release notes
  let humanNotes = notes;

  // 1. Replace markdown bullets with real bullets
  humanNotes = humanNotes.replaceAll(/^- /gm, '• ');
  humanNotes = humanNotes.replaceAll(/^(\s+)- /gm, '$1◦ ');

  // 2. Drop any issue references
  humanNotes = humanNotes.replaceAll(/ \(?\[#\d+\]\([^)]+\)\)?/g, '');

  // 3. Drop any shout-outs
  humanNotes = humanNotes.replaceAll(/ thanks to \[@[^\]]+\]\([^)]+\)/g, '');

  // 4. Strip various other markdown
  //
  // Based on https://github.com/stiang/remove-markdown/blob/master/index.js
  humanNotes = humanNotes.replace(/\[([^\]]*?)\][[(].*?[\])]/g, '$1');
  humanNotes = humanNotes.replace(/([*]+)(\S)(.*?\S)??\1/g, '$2$3');
  humanNotes = humanNotes.replace(
    /(^|\W)([_]+)(\S)(.*?\S)??\2($|\W)/g,
    '$1$3$4$5'
  );
  humanNotes = humanNotes.replace(/`(.+?)`/g, '$1');

  // 5. Drop <kbd> annotations
  // (Not doing a generic HTML strip because I'm not sure if we'd actually want
  // to keep the text content of all HTML elements.)
  humanNotes = humanNotes.replace(/<kbd>(.+?)<\/kbd>/g, '$1');

  // Generate specific notes for each browser
  notes += `\n\n<!--\n${getBrowserNotes({
    notes: humanNotes,
    supportedBrowsers,
  })}\n-->`;

  return notes;
}

const browsers = ['Firefox', 'Chrome', 'Edge', 'Safari', 'Thunderbird'];

function getSupportedBrowsers(annotation) {
  const listedBrowsers = annotation
    .replace(/(\s+|-)only$/, '')
    .split(/\s*,\s*/)
    .map((b) => b.trim().toLowerCase());

  // Check that it actually is a list of browsers
  const hasABrowser = browsers.some((browser) =>
    listedBrowsers.includes(browser.toLowerCase())
  );

  return hasABrowser ? listedBrowsers : null;
}

function getBrowserNotes({ notes, supportedBrowsers }) {
  const parts = [];

  const browsersToList = supportedBrowsers
    ? browsers.filter((b) => supportedBrowsers.includes(b.toLowerCase()))
    : browsers;
  for (const browser of browsersToList) {
    parts.push(`${browser}:\n${getNotesForBrowser({ notes, browser })}`);
  }

  return parts.join('\n\n');
}

// Goes through `notes` and filters out the points that are not relevant to
// `browser`.
function getNotesForBrowser({ notes, browser }) {
  const outputLines = [];
  let droppedParentPoint = false;

  for (const line of notes.split('\n')) {
    // Is this line a root-level point with a possible browser annotation?
    if (line.match(/^•\s+\(/)) {
      droppedParentPoint = false;
      const filteredLine = filterLine({ line, browser });
      if (filteredLine) {
        outputLines.push(filteredLine);
      } else {
        droppedParentPoint = true;
      }
      continue;
    }

    // Check for a subpoint
    if (line.match(/^\s*◦\s+/)) {
      if (droppedParentPoint) {
        continue;
      }

      const filteredLine = filterLine({ line, browser });
      if (filteredLine) {
        outputLines.push(filteredLine);
      }
      continue;
    }

    // Otherwise, add the line
    droppedParentPoint = false;
    outputLines.push(line);
  }

  if (!outputLines) {
    return '(Nothing of interest)';
  }

  return outputLines.join('\n');
}

function filterLine({ line, browser }) {
  const includedBrowsers = getBrowserAnnotations(line);
  if (!includedBrowsers) {
    return line;
  }

  if (!includedBrowsers.includes(browser.toLowerCase())) {
    return null;
  }

  // Drop the bracketed part
  return line.replace(/\(([^)]+)\)\s*/, '');
}

function getBrowserAnnotations(line) {
  // Just because a line starts with a '(', doesn't mean it's a browser
  // annotation. It could be something else like '• (Bonus!)'.
  //
  // Parse out the comma-separated items in braces
  const includedBrowsers = (line.match(/\s*[•◦]\s+\(([^)]+)\) /)?.[1] || '')
    .split(',')
    .map((b) => b.trim().toLowerCase());

  // Is at least one of them a browser?
  const hasABrowser = browsers.some((browser) =>
    includedBrowsers.includes(browser.toLowerCase())
  );

  return hasABrowser ? includedBrowsers : null;
}
