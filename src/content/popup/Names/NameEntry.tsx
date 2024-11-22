import { NameTranslation } from '@birchill/jpdict-idb';

import { NameResult } from '../../../background/search-result';
import { useLocale } from '../../../common/i18n';
import { getDob } from '../../../utils/age';
import { classes } from '../../../utils/classes';

type Props = {
  entry: NameResult;
  selectState: 'unselected' | 'selected' | 'flash';
  onPointerUp?: (evt: PointerEvent) => void;
  onClick?: () => void;
};

export function NameEntry(props: Props) {
  const kana = props.entry.r.join('、');

  return (
    <div
      class={classes(
        'entry',
        // See comment in KanjiEntry.tsx about the future plans for these
        // CSS classes.
        props.selectState === 'selected' && '-selected',
        props.selectState === 'flash' && '-flash'
      )}
      onPointerUp={props.onPointerUp}
      onClick={props.onClick}
    >
      <div class="w-title" lang="ja">
        {props.entry.k && <KanjiEntries k={props.entry.k} />}
        <span class="w-kana">{kana}</span>
      </div>
      <div class="w-def">
        {props.entry.tr.map((tr) => (
          <NameTranslationComponent key={tr.det.join()} translation={tr} />
        ))}
      </div>
    </div>
  );
}

function KanjiEntries({ k }: { k: string[] }) {
  const MAX_KANJI = 15;
  const trimKanji = k.length > MAX_KANJI;
  const kanjiToDisplay = trimKanji ? k.slice(0, MAX_KANJI) : k;
  let kanji = kanjiToDisplay.join('、');
  if (trimKanji) {
    kanji += '…';
  }

  return <span class="w-kanji">{kanji}</span>;
}

function NameTranslationComponent(props: { translation: NameTranslation }) {
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
  const annotateDetailFn = props.translation.type?.includes('person')
    ? annotateAge
    : (det: string) => det;

  return (
    // ENAMDICT only has English glosses
    <div lang="en">
      {props.translation.det.map(annotateDetailFn).join(', ')}
      {props.translation.type?.map((tag) => <Tag tag={tag} key={tag} />)}
    </div>
  );
}

function Tag({ tag }: { tag: string }) {
  const { t, langTag } = useLocale();

  const tagText = t(`content_names_tag_${tag}`);

  return tagText ? (
    <span class={`tag tag-${tag}`} lang={langTag}>
      {tagText}
    </span>
  ) : null;
}
