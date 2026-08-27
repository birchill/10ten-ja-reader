import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const parsedManifest: unknown = JSON.parse(
  readFileSync(new URL('../dist-safari/manifest.json', import.meta.url), 'utf8')
);

assert.ok(isRecord(parsedManifest));
const manifest = parsedManifest;

assert.ok(
  Array.isArray(manifest.permissions),
  'Manifest permissions are missing'
);
assert.ok(
  !manifest.permissions.includes('activeTab'),
  'Safari must not use the activeTab-only permission model'
);

assert.ok(
  Array.isArray(manifest.content_scripts),
  'Safari manifest must declare static content scripts'
);
const readerScript = manifest.content_scripts.find(
  (entry): entry is Record<string, unknown> => isReaderScript(entry)
);

assert.ok(readerScript, 'Safari manifest is missing the reader content script');
assert.ok(Array.isArray(readerScript.matches));
assert.ok(readerScript.matches.includes('http://*/*'));
assert.ok(readerScript.matches.includes('https://*/*'));
assert.equal(readerScript.all_frames, true);
assert.equal(readerScript.run_at, 'document_start');
assert.ok(
  manifest.content_scripts.every(
    (entry) => !isRecord(entry) || !('world' in entry)
  ),
  'Safari manifest must not include unsupported content script worlds'
);

const backgroundScript = readFileSync(
  new URL('../dist-safari/10ten-ja-background.js', import.meta.url),
  'utf8'
);

assert.match(
  backgroundScript,
  /class AllTabManager/,
  'Safari background bundle must use AllTabManager'
);
assert.doesNotMatch(
  backgroundScript,
  /class ActiveTabManager/,
  'Safari background bundle must not use ActiveTabManager'
);

function isReaderScript(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    Array.isArray(value.js) &&
    value.js.includes('10ten-ja-content.js')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
