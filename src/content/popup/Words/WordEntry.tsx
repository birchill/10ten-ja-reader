import {
  Gloss,
  KanjiInfo,
  LangSource,
  ReadingInfo,
  groupSenses,
} from '@birchill/jpdict-idb';
import { countMora, moraSubstring } from '@birchill/normal-jp';
import { Fragment } from 'preact';

import { Sense, WordResult } from '../../../background/search-result';
import { PartOfSpeechDisplay } from '../../../common/content-config-params';
import { useLocale } from '../../../common/i18n';
import { highPriorityLabels } from '../../../common/priority-labels';
import { classes } from '../../../utils/classes';
import { getFilteredTags } from '../../../utils/verb-tags';

import { Star } from '../Icons/Star';
import { ShowPopupOptions } from '../show-popup';

type SelectState = 'unselected' | 'selected' | 'flash';

export type WordEntryProps = {
  entry: WordResult;
  options: ShowPopupOptions;
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

  if (props.options.showDefinitions) {
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
                    {props.options.showPriority && !!kanji.p?.length && (
                      <PriorityMark priority={kanji.p} />
                    )}
                    {props.options.waniKaniVocabDisplay !== 'hide' &&
                      kanji.wk && (
                        <WaniKanjiLevelTag level={kanji.wk} ent={kanji.ent} />
                      )}
                    {props.options.bunproDisplay && kanji.bv && (
                      <BunproTag data={kanji.bv} type="vocab" />
                    )}
                    {props.options.bunproDisplay && kanji.bg && (
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
                    <Kana kana={kana} options={props.options} />
                    {props.options.showPriority && !!kana.p?.length && (
                      <PriorityMark priority={kana.p} />
                    )}
                    {props.options.bunproDisplay && kana.bv && (
                      <BunproTag data={kana.bv} type="vocab" />
                    )}
                    {props.options.bunproDisplay && kana.bg && (
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

      {props.options.showDefinitions && (
        <Definitions entry={entry} options={props.options} />
      )}
    </div>
  );
}

function HeadwordInfo({ info }: { info: Array<string> }) {
  const { t, langTag } = useLocale();

  // Some KanjiInfo/RadicalInfo values differ only by case but
  // addons-linter (as used by webext etc.) does not allow WebExtension i18n
  // keys to differ by case only.
  //
  // I couldn't find the rationale for this, the rule just magically
  // appears in https://github.com/mozilla/addons-linter/commit/3923b399f8166b59617071730b87048f45122c7e
  // it seems.
  const specialKeys: { [k in KanjiInfo | ReadingInfo]?: string } = {
    iK: 'ikanji',
    ik: 'ikana',
    oK: 'okanji',
    ok: 'okana',
    rK: 'rkanji',
    rk: 'rkana',
    // We normally don't show search-only kanji/kana headwords unless they are
    // exact matches. In those cases we should probably just indicate them as
    // "irregular" kanji/kana.
    sK: 'ikanji',
    sk: 'ikana',
  };

  return info.map((i) => {
    const key = specialKeys.hasOwnProperty(i)
      ? specialKeys[i as KanjiInfo | ReadingInfo]
      : i;

    return (
      <span key={i} class="w-head-info" lang={langTag}>
        ({t(`head_info_label_${key}`) || i})
      </span>
    );
  });
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

function Kana({
  kana,
  options,
}: {
  kana: WordResult['r'][0];
  options: ShowPopupOptions;
}) {
  const accents = kana.a;

  if (
    options.accentDisplay === 'none' ||
    typeof accents === 'undefined' ||
    (Array.isArray(accents) && !accents.length)
  ) {
    return kana.ent;
  }

  const accentPos = typeof accents === 'number' ? accents : accents[0].i;

  if (options.accentDisplay === 'downstep') {
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
        options.accentDisplay === 'binary-hi-contrast' && '-hi-contrast'
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

function Definitions({
  entry,
  options,
}: {
  entry: WordResult;
  options: { dictLang?: string; posDisplay: PartOfSpeechDisplay };
}) {
  const { t, langTag } = useLocale();

  const senses = entry.s.filter((s) => s.match);
  if (!senses.length) {
    return undefined;
  }

  if (senses.length === 1) {
    return (
      <div
        class={classes(
          'w-def',
          options.dictLang &&
            options.dictLang !== 'en' &&
            senses[0].lang !== options.dictLang &&
            'foreign'
        )}
        lang={senses[0].lang || 'en'}
      >
        <SenseComponent sense={senses[0]} posDisplay={options.posDisplay} />
      </div>
    );
  }

  // First extract any native language senses
  const nativeSenses = senses.filter((s) => s.lang && s.lang !== 'en');

  // Try grouping the remaining (English) definitions by part-of-speech.
  const enSenses = senses.filter((s) => !s.lang || s.lang === 'en');
  const posGroups = options.posDisplay !== 'none' ? groupSenses(enSenses) : [];
  const isForeign = !!options.dictLang && options.dictLang !== 'en';

  // Determine if the grouping makes sense
  //
  // If the group headings make the number of lines used to represent
  // all the senses (ignoring word wrapping) grow by more than 50%, we should
  // skip using groups. This will typically be the case where there are no
  // common parts-of-speech, or at least very few.
  const linesWithGrouping = posGroups.length + enSenses.length;
  const linesWithoutGrouping = enSenses.length;
  const useGroups =
    posGroups.length && linesWithGrouping / linesWithoutGrouping <= 1.5;
  let startIndex = 1;

  return (
    <div class="w-def">
      {nativeSenses.length > 0 && (
        <ul>
          {nativeSenses.map((sense, index) => (
            <li key={index} lang={sense.lang || 'en'}>
              <SenseComponent sense={sense} posDisplay={options.posDisplay} />
            </li>
          ))}
        </ul>
      )}

      {useGroups ? (
        posGroups.map((group) => {
          // Verb class tags were added to proverbs for inflection handling but
          // aren't user-facing. Filter them out here.
          const filteredPos = getFilteredTags(group.pos, group.misc);

          const isExpl = options.posDisplay === 'expl';

          return (
            <>
              {/*  Group heading */}
              <p class="w-group-head">
                {filteredPos.map((pos) => (
                  <span
                    key={pos}
                    lang={isExpl ? langTag : undefined}
                    class="w-pos tag"
                  >
                    {isExpl
                      ? t(`pos_label_${pos.replace(/-/g, '_')}`) || pos
                      : pos}
                  </span>
                ))}

                {group.misc.map((misc) => (
                  <span key={misc} class="w-misc tag" lang={langTag}>
                    {t(`misc_label_${misc.replace(/-/g, '_')}`) || misc}
                  </span>
                ))}

                {
                  // If there is no group heading, just add a '-' placeholder
                  !group.pos.length && !group.misc.length && (
                    <span class="w-pos tag">-</span>
                  )
                }
              </p>

              {/* Group items */}
              <ol start={startIndex}>
                {group.senses.map((sense, index) => {
                  startIndex++;

                  return (
                    <li
                      key={index}
                      class={isForeign ? 'foreign' : undefined}
                      lang={sense.lang || 'en'}
                    >
                      <SenseComponent
                        sense={sense}
                        posDisplay={options.posDisplay}
                      />
                    </li>
                  );
                })}
              </ol>
            </>
          );
        })
      ) : (
        <div>
          <ol>
            {enSenses.map((sense, index) => (
              <li
                key={index}
                class={isForeign ? 'foreign' : undefined}
                lang={sense.lang || 'en'}
              >
                <SenseComponent sense={sense} posDisplay={options.posDisplay} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function SenseComponent({
  sense,
  posDisplay,
}: {
  sense: Sense;
  posDisplay: PartOfSpeechDisplay;
}) {
  const { t, langTag } = useLocale();

  // Verb class tags were added to proverbs for inflection handling but
  // aren't user-facing. Filter them out here.
  const filteredPos = getFilteredTags(sense.pos, sense.misc);

  return (
    <>
      {posDisplay !== 'none' &&
        filteredPos.map((pos) => (
          <span
            key={pos}
            class="w-pos tag"
            lang={classes(posDisplay === 'expl' && langTag)}
          >
            {posDisplay === 'expl'
              ? t(`pos_label_${pos.replace(/-/g, '_')}`) || pos
              : posDisplay === 'code' && pos}
          </span>
        ))}

      {sense.field?.map((field) => (
        <span key={field} class="w-field tag" lang={langTag}>
          {t(`field_label_${field}`) || field}
        </span>
      ))}

      {sense.misc?.map((misc) => (
        <span key={misc} class="w-misc tag" lang={langTag}>
          {t(`misc_label_${misc.replace(/-/g, '_')}`) || misc}
        </span>
      ))}

      {sense.dial?.map((dial) => (
        <span key={dial} class="w-dial tag" lang={langTag}>
          {t(`dial_label_${dial}`) || dial}
        </span>
      ))}

      <Glosses glosses={sense.g} />

      {sense.inf && (
        <span
          class="w-inf"
          // Mark inf as Japanese because it often contains Japanese text
          lang="ja"
        >{` (${sense.inf})`}</span>
      )}

      {!!sense.lsrc?.length && <LangSources sources={sense.lsrc} />}
    </>
  );
}

function Glosses({ glosses }: { glosses: Array<Gloss> }) {
  const { t, langTag } = useLocale();

  return glosses.map((gloss, index) => {
    let typeStr = undefined;
    if (gloss.type && gloss.type !== 'tm' && gloss.type !== 'none') {
      typeStr = t(`gloss_type_label_${gloss.type}`);
    }

    return (
      <Fragment key={gloss.str}>
        {index > 0 && '; '}
        {typeStr && (
          <span class="w-type" lang={langTag}>{`(${typeStr}) `}</span>
        )}

        {gloss.str}
        {gloss.type === 'tm' && '™'}
      </Fragment>
    );
  });
}

function LangSources({ sources }: { sources: Array<LangSource> }) {
  const { t, langTag } = useLocale();

  const startsWithWasei = sources[0]?.wasei;

  return (
    <span class="w-lsrc" lang={langTag}>
      {t(startsWithWasei ? 'lang_lsrc_wasei_prefix' : 'lang_lsrc_prefix')}

      {sources.map((lsrc, index) => {
        const lang =
          t(`lang_label_${lsrc.lang || 'en'}`) || lsrc.lang || 'English';
        const prefix = lsrc.wasei ? t('lang_lsrc_wasei', [lang]) : lang;

        return (
          <>
            {index > 0 && ', '}
            {lsrc.src ? `${prefix}: ` : prefix}
            {lsrc.src && <span lang={lsrc.lang || 'en'}>{lsrc.src}</span>}
          </>
        );
      })}

      {t('lang_lsrc_suffix')}
    </span>
  );
}
