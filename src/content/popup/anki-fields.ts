/**
 * Anki field extraction utilities.
 *
 * Extracts vocabulary data from a WordResult for creating Anki flashcards.
 * The available fields are:
 * - Expression: The word in kanji (or kana if no kanji)
 * - Reading: The word's reading in kana
 * - Meaning: Numbered list of definitions
 * - Sentence: The context sentence where the word was found
 * - Romaji: Romanized reading
 * - Pitch Accent: Downstep notation of the pitch accent
 * - Part of Speech: Comma-separated grammatical tags
 * - Deinflection: How the word was deinflected (e.g. "< past")
 * - URL: The URL of the page where the word was found
 *
 * @module anki-fields
 */
import { moraSubstring } from '@birchill/normal-jp';
import browser from 'webextension-polyfill';

import { deinflectL10NKeys } from '../../background/deinflect';
import type { WordResult } from '../../background/search-result';

/**
 * Extract field values from a WordResult for creating an Anki note.
 *
 * The returned keys are the 10ten-internal field names (Expression, Reading,
 * Meaning, Sentence, Romaji, Pitch Accent, Part of Speech, Deinflection, URL).
 * The caller maps them to the user's actual Anki note field names via the
 * configured `ankiFieldMapping`.
 */
export function extractAnkiFields(
  entry: WordResult,
  options?: { sentence?: string; url?: string }
): Record<string, string> {
  // Expression: prefer matching kanji headword, fall back to first kana
  const matchingKanji = entry.k.find((k) => k.match);
  const firstKanji = entry.k[0];
  const firstKana = entry.r[0];

  const expression =
    matchingKanji?.ent ?? firstKanji?.ent ?? firstKana?.ent ?? '';

  // Reading: first matching kana headword
  const matchingKana = entry.r.find((r) => r.match);
  const reading = matchingKana?.ent ?? firstKana?.ent ?? '';

  // Meaning: join all senses with numbering
  const meaning = entry.s
    .map((sense, i) => {
      const glosses = sense.g.map((g) => g.str).join('; ');
      return entry.s.length > 1 ? `${i + 1}. ${glosses}` : glosses;
    })
    .join('\n');

  // Romaji: romanized reading from the matching or first kana entry
  const romaji = (matchingKana ?? firstKana)?.romaji ?? '';

  // Pitch Accent: downstep notation (e.g. たべꜜる)
  const pitchAccent = formatPitchAccent(matchingKana ?? firstKana);

  // Part of Speech: collect unique pos tags across all senses
  const posSet = new Set<string>();
  for (const sense of entry.s) {
    if (sense.pos) {
      for (const p of sense.pos) {
        posSet.add(p);
      }
    }
  }
  const partOfSpeech = [...posSet].join(', ');

  // Deinflection: serialize reason chains using localized labels
  const deinflection = formatDeinflection(entry);

  const fields: Record<string, string> = {
    Expression: expression,
    Reading: reading,
    Meaning: meaning,
  };

  if (options?.sentence) {
    fields['Sentence'] = options.sentence;
  }
  if (romaji) {
    fields['Romaji'] = romaji;
  }
  if (pitchAccent) {
    fields['Pitch Accent'] = pitchAccent;
  }
  if (partOfSpeech) {
    fields['Part of Speech'] = partOfSpeech;
  }
  if (deinflection) {
    fields['Deinflection'] = deinflection;
  }
  if (options?.url) {
    fields['URL'] = options.url;
  }

  return fields;
}

/**
 * Format pitch accent as downstep notation.
 *
 * For example, for a word read as たべる with accent position 2,
 * this returns "たべꜜる".
 */
function formatPitchAccent(kana: WordResult['r'][0] | undefined): string {
  if (!kana) {
    return '';
  }

  const accents = kana.a;
  if (
    typeof accents === 'undefined' ||
    (Array.isArray(accents) && !accents.length)
  ) {
    return '';
  }

  const accentPos = typeof accents === 'number' ? accents : accents[0].i;

  if (accentPos === 0) {
    // Heiban (flat) — no downstep, indicate with ⟨平⟩
    return `${kana.ent} [0]`;
  }

  return (
    moraSubstring(kana.ent, 0, accentPos) +
    'ꜜ' +
    moraSubstring(kana.ent, accentPos)
  );
}

/**
 * Format deinflection reason chains as a human-readable string.
 *
 * Uses the same localized labels as the popup display.
 */
function formatDeinflection(entry: WordResult): string {
  if (!entry.reasonChains?.length) {
    return '';
  }

  const t = (key: string) => browser.i18n.getMessage(key) || key;

  return (
    '< ' +
    entry.reasonChains
      .map((chain) =>
        chain.map((reason) => t(deinflectL10NKeys[reason])).join(' < ')
      )
      .join(t('deinflect_alternate'))
  );
}

/**
 * Given the raw 10ten field values and the user's field mapping, produce the
 * final fields object to send to AnkiConnect.
 */
export function mapAnkiFields(
  tentenFields: Record<string, string>,
  fieldMapping: Record<string, string>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [tentenKey, ankiFieldName] of Object.entries(fieldMapping)) {
    if (ankiFieldName && tentenFields[tentenKey]) {
      mapped[ankiFieldName] = tentenFields[tentenKey];
    }
  }
  return mapped;
}
