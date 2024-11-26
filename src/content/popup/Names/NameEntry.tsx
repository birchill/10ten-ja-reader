import { NameTranslation } from '@birchill/jpdict-idb';

import { NameResult } from '../../../background/search-result';
import { useLocale } from '../../../common/i18n';
import { getDob } from '../../../utils/age';
import { classes } from '../../../utils/classes';

import { usePopupOptions } from '../options-context';

type SelectState = 'unselected' | 'selected' | 'flash';

type Props = {
  entry: NameResult;
  selectState: SelectState;
  onPointerUp?: (evt: PointerEvent) => void;
  onClick?: () => void;
};

export function NameEntry(props: Props) {
  const { interactive } = usePopupOptions();

  const kana = props.entry.r.join('、');

  return (
    <div
      class={classes(
        'tp-group tp-flex tp-flex-col tp-px-4 tp-py-1.5 tp-break-inside-avoid',
        // See comment in KanjiEntry.tsx about the future plans for these
        // CSS classes.
        props.selectState === 'selected' && '-selected',
        props.selectState === 'flash' && '-flash',
        // Ensure any selection colors are applied before fading in the
        // overlay
        props.selectState === 'selected' &&
          'no-overlay:tp-text-[--selected-highlight] no-overlay:tp-bg-[--selected-bg]',
        // Run the flash animation, but not until the overlay has
        // disappeared.
        props.selectState === 'flash' && 'no-overlay:tp-animate-flash',
        ...(interactive
          ? [
              'hh:hover:tp-bg-[--hover-bg]',
              'hh:hover:tp-cursor-pointer',
              // Fade _out_ the color change
              'hh:tp-transition-colors hh:interactive:tp-duration-100',
              'hh:tp-ease-out',
              'hh:hover:tp-transition-none',
            ]
          : [])
      )}
      onPointerUp={props.onPointerUp}
      onClick={props.onClick}
    >
      <div class="tp-space-x-4" lang="ja">
        {props.entry.k?.length && (
          <KanjiEntries k={props.entry.k} selectState={props.selectState} />
        )}
        <span
          class={classes(
            'tp-text-xl',
            props.selectState === 'selected'
              ? 'no-overlay:tp-text-[--selected-reading-highlight]'
              : 'tp-text-[--reading-highlight]',
            interactive &&
              'hh:group-hover:tp-text-[--selected-reading-highlight]'
          )}
        >
          {kana}
        </span>
      </div>
      <div>
        {props.entry.tr.map((tr) => (
          <NameTranslationComponent
            key={tr.det.join()}
            translation={tr}
            selectState={props.selectState}
          />
        ))}
      </div>
    </div>
  );
}

function KanjiEntries({
  k,
  selectState,
}: {
  k: string[];
  selectState: SelectState;
}) {
  const { interactive } = usePopupOptions();

  const MAX_KANJI = 15;
  const trimKanji = k.length > MAX_KANJI;
  const kanjiToDisplay = trimKanji ? k.slice(0, MAX_KANJI) : k;
  let kanji = kanjiToDisplay.join('、');
  if (trimKanji) {
    kanji += '…';
  }

  return (
    <span
      class={classes(
        'tp-text-1.5xl',
        selectState === 'selected'
          ? 'no-overlay:tp-text-[--selected-highlight]'
          : 'tp-text-[--primary-highlight]',
        interactive && 'hh:group-hover:tp-text-[--selected-highlight]'
      )}
    >
      {kanji}
    </span>
  );
}

function NameTranslationComponent({
  translation,
  selectState,
}: {
  translation: NameTranslation;
  selectState: SelectState;
}) {
  const { interactive } = usePopupOptions();

  function annotateAge(text: string): string {
    const { t } = useLocale();

    const dob = getDob(text);
    if (!dob) {
      return text;
    }

    // Calculate age
    const { date, approx } = dob;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const month = today.getMonth() - date.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    // Sanity check
    if (age < 1 || age > 150) {
      return text;
    }

    const ageString = approx
      ? t('content_names_age_approx', [String(age)])
      : t('content_names_age', [String(age)]);

    return `${text} (${ageString})`;
  }

  // Only add age annotations if the name is for a person
  const annotateDetailFn = translation.type?.includes('person')
    ? annotateAge
    : (det: string) => det;

  return (
    // ENAMDICT only has English glosses
    <div class="tp-text-base tp-space-x-1.5" lang="en">
      <span
        class={classes(
          selectState === 'selected' &&
            'no-overlay:tp-text-[--selected-def-color]',
          interactive && 'hh:group-hover:tp-text-[--selected-def-color]'
        )}
      >
        {translation.det.map(annotateDetailFn).join(', ')}
      </span>
      {translation.type?.map((tag) => (
        <Tag tag={tag} selectState={selectState} key={tag} />
      ))}
    </div>
  );
}

function Tag({
  tag,
  selectState,
}: {
  tag: string;
  selectState: 'unselected' | 'selected' | 'flash';
}) {
  const { t, langTag } = useLocale();
  const { interactive } = usePopupOptions();

  const tagText = t(`content_names_tag_${tag}`);

  const tagColors: Record<string, string> = {
    fem: 'pink',
    masc: 'blue',
    place: 'green',
  };
  const tagColor = tagColors[tag];

  return tagText ? (
    <span
      class={classes(
        'tp-text-2xs tp-px-1 tp-whitespace-nowrap',
        'tp-rounded tp-border-solid tp-border',
        'tp-bg-[var(--color-tag-bg,transparent)]',
        ...(selectState === 'selected'
          ? [
              'no-overlay:tp-border-[var(--selected-tag-border)]',
              'no-overlay:tp-text-[var(--selected-tag-color)]',
            ]
          : [
              'tp-border-[var(--color-tag-border,var(--tag-border))]',
              'tp-text-[var(--color-tag-text-color,var(--text-color))]',
            ]),
        interactive &&
          classes(
            'hh:group-hover:tp-border-[--selected-tag-border]',
            'hh:group-hover:tp-text-[--selected-tag-color]'
          )
      )}
      style={
        tagColor && {
          '--color-tag-bg': `var(--tag-${tagColor}-bg)`,
          '--color-tag-border': `var(--tag-${tagColor}-border)`,
          '--color-tag-text-color': `var(--tag-${tagColor}-text)`,
        }
      }
      lang={langTag}
    >
      {tagText}
    </span>
  ) : null;
}
