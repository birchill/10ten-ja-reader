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
      return (
        <span
          class={classes(
            'tp:border-dotted tp:border-current',
            'tp:border-0 tp:border-t-[1.5px]'
          )}
        >
          {kana.ent}
        </span>
      );
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

  const highLow = classes(
    'tp:border-0',
    'tp:border-t-(length:--border-width)',
    'tp:border-r-(length:--border-width)'
  );
  const lowHigh = classes(
    'tp:border-0',
    'tp:border-b-(length:--border-width)',
    'tp:border-r-(length:--border-width)'
  );
  const high = classes('tp:border-0', 'tp:border-t-(length:--border-width)');
  const low = classes('tp:border-0', 'tp:border-b-(length:--border-width)');

  return (
    <span
      class={classes(
        'tp:inline-block tp:mb-1',
        'tp:*:m-0 tp:*:text-[90%] tp:*:border-dotted',
        accentDisplay === 'binary-hi-contrast'
          ? 'tp:*:border-(--hi-contrast-pitch-accent)'
          : 'tp:*:border-current'
      )}
      style={
        accentDisplay === 'binary-hi-contrast'
          ? { '--border-width': '2px' }
          : { '--border-width': '1.5px' }
      }
    >
      {accentPos === 0 || accentPos === 1 ? (
        // Accent position 0 (heiban: LHHHHH) and accent position 1 (atamadaka: HLLLL)
        // are sufficiently similar that we handle them together.
        <>
          <span class={accentPos ? highLow : moraCount > 1 ? lowHigh : high}>
            {moraSubstring(kana.ent, 0, 1)}
          </span>

          {moraCount > 1 && (
            <span class={accentPos ? low : high}>
              {moraSubstring(kana.ent, 1)}
            </span>
          )}
        </>
      ) : (
        // Otherwise we have nakadaka (LHHHHL) or odaka (LHHHH)
        <>
          <span class={lowHigh}>{moraSubstring(kana.ent, 0, 1)}</span>
          <span class={highLow}>{moraSubstring(kana.ent, 1, accentPos)}</span>

          {accentPos < moraCount && (
            <span class={low}>{moraSubstring(kana.ent, accentPos)}</span>
          )}
        </>
      )}
    </span>
  );
}
