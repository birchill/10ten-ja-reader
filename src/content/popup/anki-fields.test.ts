/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';

import { Reason } from '../../background/deinflect';
import type { WordResult } from '../../background/search-result';

import { extractAnkiFields, mapAnkiFields } from './anki-fields';

// ---------------------------------------------------------------------------
// Mock webextension-polyfill — only browser.i18n.getMessage is used
// ---------------------------------------------------------------------------

vi.mock('webextension-polyfill', () => ({
  default: {
    i18n: {
      getMessage: (key: string) => {
        // Return human-readable labels so tests can assert on readable output
        const map: Record<string, string> = {
          deinflect_past: 'past',
          deinflect_negative: 'negative',
          deinflect_te: 'te-form',
          deinflect_polite: 'polite',
          deinflect_causative: 'causative',
          deinflect_passive: 'passive',
          deinflect_alternate: ' or ',
        };
        return map[key] ?? key;
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Helper to build a minimal WordResult-like object
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<{
    k: WordResult['k'];
    r: WordResult['r'];
    s: WordResult['s'];
    reasonChains: WordResult['reasonChains'];
  }> = {}
): WordResult {
  return {
    id: 1,
    k: overrides.k ?? [],
    r: overrides.r ?? [
      { ent: 'たべる', match: true, romaji: 'taberu' } as WordResult['r'][0],
    ],
    s: overrides.s ?? [
      { g: [{ str: 'to eat' }], pos: ['v1'] } as unknown as WordResult['s'][0],
    ],
    reasonChains: overrides.reasonChains,
    matchLen: 3,
  } as WordResult;
}

function makeKanji(ent: string, match = false): WordResult['k'][0] {
  return { ent, match } as WordResult['k'][0];
}

function makeKana(
  ent: string,
  opts: Partial<{
    match: boolean;
    romaji: string;
    a: number | Array<{ i: number }>;
  }> = {}
): WordResult['r'][0] {
  return {
    ent,
    match: opts.match ?? false,
    romaji: opts.romaji ?? '',
    a: opts.a,
  } as WordResult['r'][0];
}

// =========================================================================
// extractAnkiFields
// =========================================================================

describe('extractAnkiFields', () => {
  // -----------------------------------------------------------------------
  // Expression
  // -----------------------------------------------------------------------

  describe('Expression field', () => {
    it('uses matching kanji headword when available', () => {
      const entry = makeEntry({
        k: [makeKanji('食物'), makeKanji('食べる', true)],
        r: [makeKana('たべる', { match: true, romaji: 'taberu' })],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Expression']).toBe('食べる');
    });

    it('falls back to first kanji when no kanji matches', () => {
      const entry = makeEntry({
        k: [makeKanji('食べる'), makeKanji('喰べる')],
        r: [makeKana('たべる', { match: true, romaji: 'taberu' })],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Expression']).toBe('食べる');
    });

    it('falls back to first kana when there are no kanji entries', () => {
      const entry = makeEntry({
        k: [],
        r: [makeKana('すごい', { match: true, romaji: 'sugoi' })],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Expression']).toBe('すごい');
    });
  });

  // -----------------------------------------------------------------------
  // Reading
  // -----------------------------------------------------------------------

  describe('Reading field', () => {
    it('uses matching kana headword', () => {
      const entry = makeEntry({
        r: [
          makeKana('たべる', { match: false, romaji: 'taberu' }),
          makeKana('くう', { match: true, romaji: 'kuu' }),
        ],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Reading']).toBe('くう');
    });

    it('falls back to first kana when none match', () => {
      const entry = makeEntry({
        r: [
          makeKana('たべる', { match: false, romaji: 'taberu' }),
          makeKana('くう', { match: false, romaji: 'kuu' }),
        ],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Reading']).toBe('たべる');
    });
  });

  // -----------------------------------------------------------------------
  // Meaning
  // -----------------------------------------------------------------------

  describe('Meaning field', () => {
    it('formats a single sense without numbering', () => {
      const entry = makeEntry({
        s: [
          {
            g: [{ str: 'to eat' }, { str: 'to consume' }],
          } as unknown as WordResult['s'][0],
        ],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Meaning']).toBe('to eat; to consume');
    });

    it('formats multiple senses with numbering', () => {
      const entry = makeEntry({
        s: [
          { g: [{ str: 'to eat' }] } as unknown as WordResult['s'][0],
          { g: [{ str: 'to live' }] } as unknown as WordResult['s'][0],
        ],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Meaning']).toBe('1. to eat\n2. to live');
    });
  });

  // -----------------------------------------------------------------------
  // Romaji
  // -----------------------------------------------------------------------

  describe('Romaji field', () => {
    it('includes romaji from matching kana entry', () => {
      const entry = makeEntry({
        r: [makeKana('たべる', { match: true, romaji: 'taberu' })],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Romaji']).toBe('taberu');
    });

    it('omits romaji when empty', () => {
      const entry = makeEntry({
        r: [makeKana('たべる', { match: true, romaji: '' })],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Romaji']).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Pitch Accent
  // -----------------------------------------------------------------------

  describe('Pitch Accent field', () => {
    it('returns empty string when accent data is missing', () => {
      const entry = makeEntry({
        r: [makeKana('たべる', { match: true, romaji: 'taberu' })],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Pitch Accent']).toBeUndefined();
    });

    it('returns heiban notation for accent position 0', () => {
      const entry = makeEntry({
        r: [makeKana('たべる', { match: true, romaji: 'taberu', a: 0 })],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Pitch Accent']).toBe('たべる [0]');
    });

    it('inserts downstep marker ꜜ for non-zero accent (number form)', () => {
      const entry = makeEntry({
        r: [makeKana('たべる', { match: true, romaji: 'taberu', a: 2 })],
      });

      const fields = extractAnkiFields(entry);
      // moraSubstring(たべる, 0, 2) = たべ, moraSubstring(たべる, 2) = る
      expect(fields['Pitch Accent']).toBe('たべꜜる');
    });

    it('handles array-style accent using first i value', () => {
      const entry = makeEntry({
        r: [
          makeKana('たべる', { match: true, romaji: 'taberu', a: [{ i: 2 }] }),
        ],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Pitch Accent']).toBe('たべꜜる');
    });

    it('returns empty for empty accent array', () => {
      const entry = makeEntry({
        r: [
          makeKana('たべる', {
            match: true,
            romaji: 'taberu',
            a: [] as unknown as Array<{ i: number }>,
          }),
        ],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Pitch Accent']).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Part of Speech
  // -----------------------------------------------------------------------

  describe('Part of Speech field', () => {
    it('collects unique POS tags across senses', () => {
      const entry = makeEntry({
        s: [
          {
            g: [{ str: 'to eat' }],
            pos: ['v1', 'vt'],
          } as unknown as WordResult['s'][0],
          {
            g: [{ str: 'to live' }],
            pos: ['v1', 'vi'],
          } as unknown as WordResult['s'][0],
        ],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Part of Speech']).toBe('v1, vt, vi');
    });

    it('omits Part of Speech when no POS tags exist', () => {
      const entry = makeEntry({
        s: [{ g: [{ str: 'hello' }] } as unknown as WordResult['s'][0]],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Part of Speech']).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Deinflection
  // -----------------------------------------------------------------------

  describe('Deinflection field', () => {
    it('returns empty when there are no reason chains', () => {
      const entry = makeEntry({ reasonChains: undefined });

      const fields = extractAnkiFields(entry);
      expect(fields['Deinflection']).toBeUndefined();
    });

    it('returns empty for empty reason chains array', () => {
      const entry = makeEntry({ reasonChains: [] });

      const fields = extractAnkiFields(entry);
      expect(fields['Deinflection']).toBeUndefined();
    });

    it('formats a single reason', () => {
      const entry = makeEntry({ reasonChains: [[Reason.Past]] });

      const fields = extractAnkiFields(entry);
      expect(fields['Deinflection']).toBe('< past');
    });

    it('chains multiple reasons with " < "', () => {
      const entry = makeEntry({
        reasonChains: [[Reason.Negative, Reason.Past]],
      });

      const fields = extractAnkiFields(entry);
      expect(fields['Deinflection']).toBe('< negative < past');
    });

    it('joins alternate chains with the alternate separator', () => {
      const entry = makeEntry({ reasonChains: [[Reason.Past], [Reason.Te]] });

      const fields = extractAnkiFields(entry);
      expect(fields['Deinflection']).toBe('< past or te-form');
    });
  });

  // -----------------------------------------------------------------------
  // Optional fields: Sentence, URL
  // -----------------------------------------------------------------------

  describe('optional fields', () => {
    it('includes sentence when provided', () => {
      const entry = makeEntry();
      const fields = extractAnkiFields(entry, { sentence: '彼は食べている。' });

      expect(fields['Sentence']).toBe('彼は食べている。');
    });

    it('omits sentence when not provided', () => {
      const entry = makeEntry();
      const fields = extractAnkiFields(entry);

      expect(fields['Sentence']).toBeUndefined();
    });

    it('includes URL when provided', () => {
      const entry = makeEntry();
      const fields = extractAnkiFields(entry, {
        url: 'https://example.com/page',
      });

      expect(fields['URL']).toBe('https://example.com/page');
    });

    it('omits URL when not provided', () => {
      const entry = makeEntry();
      const fields = extractAnkiFields(entry);

      expect(fields['URL']).toBeUndefined();
    });
  });
});

// =========================================================================
// mapAnkiFields
// =========================================================================

describe('mapAnkiFields', () => {
  it('maps 10ten field names to Anki field names', () => {
    const tentenFields: Record<string, string> = {
      Expression: '食べる',
      Reading: 'たべる',
      Meaning: 'to eat',
    };

    const mapping: Record<string, string> = {
      Expression: 'Front',
      Reading: 'Reading',
      Meaning: 'Back',
    };

    const result = mapAnkiFields(tentenFields, mapping);
    expect(result).toEqual({
      Front: '食べる',
      Reading: 'たべる',
      Back: 'to eat',
    });
  });

  it('skips fields where the Anki field name is empty', () => {
    const tentenFields: Record<string, string> = {
      Expression: '食べる',
      Reading: 'たべる',
    };

    const mapping: Record<string, string> = {
      Expression: 'Front',
      Reading: '', // unmapped
    };

    const result = mapAnkiFields(tentenFields, mapping);
    expect(result).toEqual({ Front: '食べる' });
  });

  it('skips fields where the 10ten value is missing', () => {
    const tentenFields: Record<string, string> = {
      Expression: '食べる',
      // Reading is missing
    };

    const mapping: Record<string, string> = {
      Expression: 'Front',
      Reading: 'Reading',
    };

    const result = mapAnkiFields(tentenFields, mapping);
    expect(result).toEqual({ Front: '食べる' });
  });

  it('returns empty object for empty mapping', () => {
    const tentenFields: Record<string, string> = { Expression: '食べる' };

    const result = mapAnkiFields(tentenFields, {});
    expect(result).toEqual({});
  });
});
