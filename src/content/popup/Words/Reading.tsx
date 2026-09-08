import type { WordResult } from '@birchill/jpdict-idb';

import type { AccentDisplay } from '../../../common/content-config-params';
import { classes } from '../../../utils/classes';

import type { ReadingTokenAccent } from '../../tts/reading-tokens';
import {
  getAccentPos,
  getReadingTokens,
  groupReadingTokens,
  groupText,
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

  // Heiban has no mark to insert, so it falls through to the accent layer
  // below. Drop the accentPos test and heiban looks like missing accent data.
  if (accentDisplay === 'downstep' && accentPos !== 0) {
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
      {groupReadingTokens(tokens).map((group, index) => (
        <span key={index} class={accentClasses(group.accent)}>
          {groupText(group)}
        </span>
      ))}
    </span>
  );
}

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
