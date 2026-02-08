/**
 * Anki field extraction utilities.
 *
 * Extracts vocabulary data from a WordResult for creating Anki flashcards.
 * The four available fields are:
 * - Expression: The word in kanji (or kana if no kanji)
 * - Reading: The word's reading in kana
 * - Meaning: Numbered list of definitions
 * - Sentence: The context sentence where the word was found
 *
 * @module anki-fields
 */
import type { WordResult } from '../../background/search-result';

/**
 * Extract field values from a WordResult for creating an Anki note.
 *
 * The returned keys are the 10ten-internal field names (Expression, Reading,
 * Meaning, Sentence).  The caller maps them to the user's actual Anki note
 * field names via the configured `ankiFieldMapping`.
 */
export function extractAnkiFields(
  entry: WordResult,
  sentence?: string
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

  return {
    Expression: expression,
    Reading: reading,
    Meaning: meaning,
    ...(sentence ? { Sentence: sentence } : {}),
  };
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
