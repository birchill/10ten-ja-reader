import { Fragment } from 'preact';

import { WordResult } from '../../../background/search-result';
import { ContentConfigParams } from '../../../common/content-config-params';
import { useLocale } from '../../../common/i18n';
import { highPriorityLabels } from '../../../common/priority-labels';
import { classes } from '../../../utils/classes';

import { Star } from '../Icons/Star';

import { Definitions } from './Definitions';
import { HeadwordInfo } from './HeadwordInfo';
import { Reading } from './Reading';

type SelectState = 'unselected' | 'selected' | 'flash';

export type WordEntryConfig = Pick<
  ContentConfigParams,
  | 'accentDisplay'
  | 'dictLang'
  | 'bunproDisplay'
  | 'posDisplay'
  | 'showPriority'
  | 'waniKaniVocabDisplay'
  | 'readingOnly'
>;

export type WordEntryProps = {
  entry: WordResult;
  config: WordEntryConfig;
  selectState: SelectState;
  onPointerUp?: (evt: PointerEvent) => void;
  onClick?: (evt: MouseEvent) => void;
};

export function WordEntry(props: WordEntryProps) {
  const { entry } = props;
  const { t, langTag } = useLocale();

  const matchedOnKana = entry.r.some((r) => r.matchRange);

  // If we matched on a search-only kanji or kana headword we want to show it
  // prior to the main entry.
  const matchedOnlyOnSearchOnlyKanji =
    !matchedOnKana && entry.k.every((k) => !k.match || k.i?.includes('sK'));
  const matchedOnlyOnSearchOnlyKana =
    matchedOnKana && entry.r.every((r) => !r.match || r.i?.includes('sk'));
  const searchOnlyMatch = matchedOnKana
    ? matchedOnlyOnSearchOnlyKana
      ? entry.r.find((r) => !!r.matchRange)?.ent
      : undefined
    : matchedOnlyOnSearchOnlyKanji
      ? entry.k.find((k) => !!k.matchRange)?.ent
      : undefined;

  const kanjiHeadwords = entry.k
    ? entry.k.filter((k) => !k.i?.includes('sK'))
    : [];

  // If we matched on kana, then any headwords which are _not_ matches should
  // be hidden since they don't apply to the kana.
  //
  // This is because we mostly only show matching kana headwords and so if we
  // start showing kanji that don't correspond to the kana headwords, the
  // result will be misleading.
  //
  // For example, take the string さいだん. Entry 1385120 has readings
  // さいだん and せつだん but さいだん is specifically bound to the 截断
  // kanji.
  //
  // As a result if we look up さいだん we'll mark the さいだん kana headword
  // as a match and the 截断 kanji headword too. As per our usual processing,
  // we'll only show the さいだん kana headword, however, not せつだん.
  //
  // If we were also to show the unmatched 切断 kanji headword we'd end up
  // displaying:
  //
  // 截断、切断  さいだん
  //
  // which would be misleading since 切断 can never have that reading.
  const matchingKanji = matchedOnKana
    ? kanjiHeadwords.filter((k) => k.match)
    : kanjiHeadwords;

  // Sort matched kanji entries first
  matchingKanji.sort((a, b) => Number(b.match) - Number(a.match));

  // Typically we only show the matching kana headwords but if we matched on
  // an irregular form or a search-only form, we should show the regular kana
  // headwords too, for reference.
  //
  // For example, if we looked up ふんいき (雰囲気) we should only show that
  // headword, but if we looked up ふいんき, we should show the more correct
  // ふんいき too.
  const matchedOnIrregularKana =
    matchedOnKana &&
    entry.r.every(
      (r) =>
        !r.match ||
        r.i?.includes('ik') ||
        r.i?.includes('ok') ||
        r.i?.includes('rk') ||
        r.i?.includes('sk')
    );

  // For search-only kanji, we show them only if they are the ONLY matches.
  const matchingKana = entry.r.filter(
    (r) =>
      !r.i?.includes('sk') &&
      (r.match ||
        (matchedOnIrregularKana &&
          !r.i?.includes('ik') &&
          !r.i?.includes('ok') &&
          !r.i?.includes('rk') &&
          !r.i?.includes('sk')))
  );

  if (!props.config.readingOnly) {
    // If we have hidden all the kanji headwords, then we shouldn't show
    // "usually kana" annotations on definitions.
    if (!matchingKanji.length) {
      entry.s = entry.s.map((s) => ({
        ...s,
        misc: s.misc?.filter((m) => m !== 'uk'),
      }));
    }
  }

  return (
    <div class="entry" onPointerUp={props.onPointerUp} onClick={props.onClick}>
      <div>
        {searchOnlyMatch && (
          <div class="tp:mb-1 tp:text-sm tp:opacity-70">
            {t('content_sk_match_src', searchOnlyMatch)}
          </div>
        )}

        {matchingKanji.length > 0 && (
          <span class="w-kanji" lang="ja">
            {matchingKanji.map((kanji, index) => {
              const ki = new Set(kanji.i || []);

              const dimmed =
                // Always dim search-only kanji
                ki.has('sK') ||
                // Dim the non-matching kanji unless there are none because we
                // matched only on search-only kanji headwords.
                (!kanji.match && !matchedOnlyOnSearchOnlyKanji) ||
                // If we matched on the reading, dim any kanji headwords that are
                // irregular, old, or rare.
                (matchedOnKana &&
                  (ki.has('iK') || ki.has('oK') || ki.has('rK')));

              return (
                <Fragment key={kanji.ent}>
                  {index > 0 && <span class="separator">、</span>}
                  <span class={classes(dimmed && 'dimmed')}>
                    {kanji.ent}
                    {!!kanji.i?.length && <HeadwordInfo info={kanji.i} />}
                    {props.config.showPriority && !!kanji.p?.length && (
                      <PriorityMark priority={kanji.p} />
                    )}
                    {props.config.waniKaniVocabDisplay !== 'hide' &&
                      kanji.wk && (
                        <WaniKanjiLevelTag level={kanji.wk} ent={kanji.ent} />
                      )}
                    {props.config.bunproDisplay && kanji.bv && (
                      <BunproTag data={kanji.bv} type="vocab" />
                    )}
                    {props.config.bunproDisplay && kanji.bg && (
                      <BunproTag data={kanji.bg} type="grammar" />
                    )}
                  </span>
                </Fragment>
              );
            })}
          </span>
        )}

        {matchingKana.length > 0 && (
          <span class="w-kana" lang="ja">
            {matchingKana.map((kana, index) => {
              // Dim irrelevant headwords
              const dimmed =
                // If we looked up by kanji, dim any kana headwords that are
                // irregular, old, or rare.
                !matchedOnKana &&
                (kana.i?.includes('ik') ||
                  kana.i?.includes('ok') ||
                  kana.i?.includes('rk'));

              return (
                <Fragment key={kana.ent}>
                  {index > 0 && <span class="separator">、</span>}
                  <span class={dimmed ? 'dimmed' : undefined}>
                    <Reading
                      kana={kana}
                      accentDisplay={props.config.accentDisplay}
                    />
                    {!!kana.i?.length && <HeadwordInfo info={kana.i} />}
                    {props.config.showPriority && !!kana.p?.length && (
                      <PriorityMark priority={kana.p} />
                    )}
                    {props.config.bunproDisplay && kana.bv && (
                      <BunproTag data={kana.bv} type="vocab" />
                    )}
                    {props.config.bunproDisplay && kana.bg && (
                      <BunproTag data={kana.bg} type="grammar" />
                    )}
                  </span>
                </Fragment>
              );
            })}
          </span>
        )}

        {!!entry.romaji?.length && (
          <span class="w-romaji" lang="ja">
            {entry.romaji.join(', ')}
          </span>
        )}

        {entry.reason && (
          <span class="w-conj" lang={langTag}>
            {`(${entry.reason})`}
          </span>
        )}
      </div>

      {!props.config.readingOnly && (
        <Definitions entry={entry} options={props.config} />
      )}
    </div>
  );
}

function PriorityMark({ priority }: { priority: Array<string> }) {
  // These are the ones that are annotated with a (P) in the EDICT file.
  const highPriorityLabelsSet = new Set(highPriorityLabels);
  const highPriority = priority.some((p) => highPriorityLabelsSet.has(p));

  return <Star style={highPriority ? 'full' : 'hollow'} />;
}

function WaniKanjiLevelTag({ level, ent }: { level: number; ent: string }) {
  const { t } = useLocale();

  return (
    <a
      class="wk-level"
      href={`https://wanikani.com/vocabulary/${encodeURIComponent(ent)}`}
      target="_blank"
      rel="noreferrer"
      title={t('content_wk_link_title', ent)}
    >
      <span>{level}</span>
    </a>
  );
}

function BunproTag({
  data,
  type,
}: {
  data: { l: number; src?: string };
  type: 'vocab' | 'grammar';
}) {
  const { t } = useLocale();

  const label = t(
    type === 'vocab' ? 'popup_bp_vocab_tag' : 'popup_bp_grammar_tag',
    [String(data.l)]
  );

  return (
    <span class={`bp-tag -${type}`}>
      <span>{label}</span>
      {data.src && <span class="bp-src">{data.src}</span>}
    </span>
  );
}
