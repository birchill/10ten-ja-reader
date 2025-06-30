import { Gloss, LangSource } from '@birchill/jpdict-idb';
import { Fragment } from 'preact';

import { Sense as WordResultSense } from '../../../background/search-result';
import { PartOfSpeechDisplay } from '../../../common/content-config-params';
import { useLocale } from '../../../common/i18n';
import { getFilteredTags } from '../../../utils/verb-tags';

import { Tag } from '../Tag';

export function Sense({
  sense,
  posDisplay,
}: {
  sense: WordResultSense;
  posDisplay: PartOfSpeechDisplay;
}) {
  const { t, langTag } = useLocale();

  // Verb class tags were added to proverbs for inflection handling but
  // aren't user-facing. Filter them out here.
  const filteredPos = getFilteredTags(sense.pos, sense.misc);

  return (
    <>
      <span class="tp:*:mr-1">
        {posDisplay !== 'none' &&
          filteredPos.map((pos) => (
            <Tag
              key={pos}
              tagType="pos"
              text={
                posDisplay === 'expl'
                  ? t(`pos_label_${pos.replace(/-/g, '_')}`) || pos
                  : posDisplay === 'code'
                    ? pos
                    : undefined
              }
              langTag={langTag}
            />
          ))}

        {sense.field?.map((field) => (
          <Tag
            key={field}
            tagType="field"
            text={t(`field_label_${field}`) || field}
            langTag={langTag}
          />
        ))}

        {sense.misc?.map((misc) => (
          <Tag
            key={misc}
            tagType="misc"
            text={t(`misc_label_${misc.replace(/-/g, '_')}`) || misc}
            langTag={langTag}
          />
        ))}

        {sense.dial?.map((dial) => (
          <Tag
            key={dial}
            tagType="dial"
            text={t(`dial_label_${dial}`) || dial}
            langTag={langTag}
          />
        ))}
      </span>

      <Glosses glosses={sense.g} />

      {sense.inf && (
        <span
          class="tp:text-sm"
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
          <span class="tp:text-sm" lang={langTag}>{`(${typeStr}) `}</span>
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
    <span class="tp:text-sm" lang={langTag}>
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
