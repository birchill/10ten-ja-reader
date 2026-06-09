/**
 * Returns the release notes for the given version.
 *
 * @param {{ changeLog: string; version: string }} options
 * @returns {string}
 */
export function formatReleaseNotes({ changeLog, version }) {
  const notes = extractVersionNotes({ changeLog, version });
  const humanNotes = toHumanNotes(notes);

  // Generate specific notes for each browser
  return `${notes}\n\n<!--\n${getBrowserNotes({ notes: humanNotes })}\n-->`;
}

/**
 * Returns the list of browsers that have at least one applicable note in the
 * given version's release notes, in canonical order.
 *
 * A note with no browser annotation applies to every browser, so this returns
 * the full set unless _every_ note is annotated to exclude some browser. This
 * is what determines which stores a release is published to (a browser with no
 * notes gets no section in the release notes, so its publish step is skipped).
 *
 * @param {{ changeLog: string; version: string }} options
 * @returns {Array<string>}
 */
export function getReleaseTargets({ changeLog, version }) {
  const humanNotes = toHumanNotes(extractVersionNotes({ changeLog, version }));
  return browsers.filter(
    (browser) => getNotesForBrowser({ notes: humanNotes, browser }) !== null
  );
}

export const browsers = ['Firefox', 'Chrome', 'Edge', 'Safari', 'Thunderbird'];

// Extracts the raw markdown body for the given version, with line-wrapped
// bullet points merged onto a single line.
function extractVersionNotes({ changeLog, version }) {
  // Get the lines of the changelog for the specified version
  const lines = changeLog.split(/\r\n|\r|\n/g);
  const start = lines.findIndex((line) => isVersionHeading({ line, version }));
  if (start === -1) {
    throw new Error(`Could not find release notes for version ${version}`);
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

  return notes;
}

// Converts the markdown release notes into the human-friendly form used for
// store submissions.
function toHumanNotes(notes) {
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

  return humanNotes;
}

function isVersionHeading({ line, version }) {
  const headingMatch = line.match(/^##\s+(.+?)\s*$/);
  if (!headingMatch) {
    return false;
  }

  return hasVersionPrefix({ text: headingMatch[1], version });
}

function hasVersionPrefix({ text, version }) {
  for (const prefix of [`[${version}]`, version]) {
    if (!text.startsWith(prefix)) {
      continue;
    }

    const nextChar = text[prefix.length];
    return !nextChar || /\s/.test(nextChar);
  }

  return false;
}

function getBrowserNotes({ notes }) {
  const parts = [];

  for (const browser of browsers) {
    const browserNotes = getNotesForBrowser({ notes, browser });
    // Omit browsers that have no applicable notes so that the corresponding
    // store publish step is skipped.
    if (browserNotes !== null) {
      parts.push(`${browser}:\n${browserNotes}`);
    }
  }

  return parts.join('\n\n');
}

// Goes through `notes` and filters out the points that are not relevant to
// `browser`, returning `null` if nothing applies to it.
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

  // If no actual notes apply to this browser, signal that it should be omitted
  // entirely.
  const hasNotes = outputLines.some((line) => /^\s*[•◦]/.test(line));
  return hasNotes ? outputLines.join('\n') : null;
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
