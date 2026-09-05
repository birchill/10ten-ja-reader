import type { WordResult } from '@birchill/jpdict-idb';
import { countMora } from '@birchill/normal-jp';

import type { AccentDisplay } from '../../common/content-config-params';

export type ReadingTokenAccent = 'high' | 'low' | 'rise' | 'fall';

export type ReadingToken = {
  /** One mora — one codepoint, or several combined, as in きゃ or ぎゃぁ. */
  text: string;
  /** Codepoint offset of the mora's first character. */
  charIndex: number;
  accent?: ReadingTokenAccent;
  /** A downstep mark (ꜜ) follows this mora. */
  downstep?: boolean;
};

export function getReadingTokens(
  kana: string,
  accentPos: number | undefined,
  accentDisplay: AccentDisplay
): Array<ReadingToken> {
  const moras = splitMoras(kana);
  if (accentDisplay === 'none' || accentPos === undefined) {
    return moras;
  }

  // Accent data can name a position past the reading's last mora. Clamp to
  // `moras.length`, not `length - 1`, so the `accent - 1` lookup below still
  // lands on the final mora instead of dropping the downstep.
  const accent = Math.min(accentPos, moras.length);

  if (accentDisplay === 'downstep') {
    // Heiban has no downstep to mark, so its overline is the accent every mora
    // carries.
    return accent === 0
      ? moras.map((mora) => ({ ...mora, accent: 'high' as const }))
      : moras.map((mora, index) =>
          index === accent - 1 ? { ...mora, downstep: true } : mora
        );
  }

  return moras.map((mora, index) => ({
    ...mora,
    accent: binaryAccent(index + 1, moras.length, accent),
  }));
}

function splitMoras(kana: string): Array<ReadingToken> {
  const moras: Array<ReadingToken> = [];
  let prefix = '';
  let count = 0;

  for (const [charIndex, char] of [...kana].entries()) {
    prefix += char;
    const mora = countMora(prefix);
    const last = moras[moras.length - 1];
    if (last && mora === count) {
      last.text += char;
    } else {
      moras.push({ text: char, charIndex });
      count = mora;
    }
  }

  return moras;
}

function binaryAccent(
  mora: number,
  moraCount: number,
  accentPos: number
): ReadingTokenAccent {
  // Heiban: LHHHH, or H for a single mora.
  if (accentPos === 0) {
    return mora === 1 && moraCount > 1 ? 'rise' : 'high';
  }

  // Atamadaka: HLLLL.
  if (accentPos === 1) {
    return mora === 1 ? 'fall' : 'low';
  }

  // Nakadaka: LHHHL, or odaka: LHHHH.
  if (mora === 1) {
    return 'rise';
  }
  if (mora < accentPos) {
    return 'high';
  }
  return mora === accentPos ? 'fall' : 'low';
}

export function coalesceReadingTokens(
  tokens: ReadonlyArray<ReadingToken>
): Array<{ text: string; accent?: ReadingTokenAccent }> {
  const segments: Array<{ text: string; accent?: ReadingTokenAccent }> = [];

  for (const token of tokens) {
    const last = segments[segments.length - 1];
    const continues =
      last &&
      (last.accent === token.accent ||
        (last.accent === 'high' && token.accent === 'fall'));
    if (continues) {
      last.text += token.text;
      last.accent = token.accent;
    } else {
      segments.push({ text: token.text, accent: token.accent });
    }
  }

  return segments;
}

export function getAccentPos(
  accents: WordResult['r'][0]['a']
): number | undefined {
  if (Array.isArray(accents)) {
    return accents.length ? accents[0].i : undefined;
  }
  return accents;
}
