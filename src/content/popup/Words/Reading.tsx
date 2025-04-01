import { WordResult } from '@birchill/jpdict-idb';
import { countMora, moraSubstring } from '@birchill/normal-jp';

import { AccentDisplay } from '../../../common/content-config-params';
import { classes } from '../../../utils/classes';

export function Reading({
  kana,
  accentDisplay,
}: {
  kana: WordResult['r'][0];
  accentDisplay: AccentDisplay;
}) {
  const accents = kana.a;

  if (
    accentDisplay === 'none' ||
    typeof accents === 'undefined' ||
    (Array.isArray(accents) && !accents.length)
  ) {
    return kana.ent;
  }

  const accentPos = typeof accents === 'number' ? accents : accents[0].i;

  if (accentDisplay === 'downstep') {
    if (!accentPos) {
      // accentPos 0 (heiban) is special since there's no accent to show.
      //
      // At the same time we want to distinguish between heiban and
      // "no accent information". So we indicate heiban with a dotted line
      // across the top instead.
      return <span class="w-heiban">{kana.ent}</span>;
    } else {
      return (
        moraSubstring(kana.ent, 0, accentPos) +
        'ꜜ' +
        moraSubstring(kana.ent, accentPos)
      );
    }
  }

  // Generate binary pitch display
  const moraCount = countMora(kana.ent);
  return (
    <span
      class={classes(
        'w-binary',
        accentDisplay === 'binary-hi-contrast' && '-hi-contrast'
      )}
    >
      {accentPos === 0 || accentPos === 1 ? (
        // Accent position 0 (heiban: LHHHHH) and accent position 1 (atamadaka: HLLLL)
        // are sufficiently similar that we handle them together.
        <>
          <span class={accentPos ? 'h-l' : moraCount > 1 ? 'l-h' : 'h'}>
            {moraSubstring(kana.ent, 0, 1)}
          </span>

          {moraCount > 1 && (
            <span class={accentPos ? 'l' : 'h'}>
              {moraSubstring(kana.ent, 1)}
            </span>
          )}
        </>
      ) : (
        // Otherwise we have nakadaka (LHHHHL) or odaka (LHHHH)
        <>
          <span class="l-h">{moraSubstring(kana.ent, 0, 1)}</span>
          <span class="h-l">{moraSubstring(kana.ent, 1, accentPos)}</span>

          {accentPos < moraCount && (
            <span class="l">{moraSubstring(kana.ent, accentPos)}</span>
          )}
        </>
      )}
    </span>
  );
}
