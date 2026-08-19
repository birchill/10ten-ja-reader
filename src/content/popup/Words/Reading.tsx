import type { WordResult } from '@birchill/jpdict-idb';

import type { AccentDisplay } from '../../../common/content-config-params';
import { classes } from '../../../utils/classes';

import type { ReadingTokenAccent } from '../../tts/reading-tokens';
import {
  coalesceReadingTokens,
  getAccentPos,
  getReadingTokens,
} from '../../tts/reading-tokens';

export function Reading({
  kana,
  accentDisplay,
}: {
  kana: WordResult['r'][0];
  accentDisplay: AccentDisplay;
}) {
  const accentPos = getAccentPos(kana.a);

  if (accentDisplay === 'none' || accentPos === undefined) {
    return kana.ent;
  }

  const tokens = getReadingTokens(kana.ent, accentPos, accentDisplay);

  if (accentDisplay === 'downstep') {
    if (accentPos === 0) {
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
    }

    return tokens
      .map((token) => (token.downstep ? `${token.text}ꜜ` : token.text))
      .join('');
  }

  const layer = accentLayer(accentDisplay);

  return (
    <span
      class={classes(
        layer.classes,
        'tp:*:border-dotted',
        accentDisplay === 'binary-hi-contrast'
          ? 'tp:*:border-(--hi-contrast-pitch-accent)'
          : 'tp:*:border-current'
      )}
      style={{ '--border-width': layer.borderWidth }}
    >
      {coalesceReadingTokens(tokens).map((segment, index) => (
        <span key={index} class={accentClasses(segment.accent)}>
          {segment.text}
        </span>
      ))}
    </span>
  );
}

/**
 * The box a reading's accent marks are drawn in. The karaoke overlay stacks on
 * top of that box, so it has to be laid out from the same numbers.
 */
export function accentLayer(accentDisplay: AccentDisplay): {
  classes: string | undefined;
  borderWidth: string;
} {
  const scaled = 'tp:inline-block tp:mb-1 tp:*:m-0 tp:*:text-[90%]';

  switch (accentDisplay) {
    case 'binary':
      return { classes: scaled, borderWidth: '1.5px' };

    case 'binary-hi-contrast':
      return { classes: scaled, borderWidth: '2px' };

    // Downstep marks and a bare reading sit in the running text, at its size.
    case 'downstep':
    case 'none':
      return { classes: undefined, borderWidth: '1.5px' };
  }
}

export function accentClasses(
  accent: ReadingTokenAccent | undefined
): string | undefined {
  switch (accent) {
    case 'high':
      return classes('tp:border-0', 'tp:border-t-(length:--border-width)');

    case 'low':
      return classes('tp:border-0', 'tp:border-b-(length:--border-width)');

    case 'fall':
      return classes(
        'tp:border-0',
        'tp:border-t-(length:--border-width)',
        'tp:border-r-(length:--border-width)'
      );

    case 'rise':
      return classes(
        'tp:border-0',
        'tp:border-b-(length:--border-width)',
        'tp:border-r-(length:--border-width)'
      );

    case undefined:
      return undefined;
  }
}
