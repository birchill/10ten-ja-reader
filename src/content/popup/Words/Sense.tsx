import { Gloss, LangSource } from '@birchill/jpdict-idb';
import { Fragment } from 'preact';

import { Sense as WordResultSense } from '../../../background/search-result';
import { PartOfSpeechDisplay } from '../../../common/content-config-params';
import { useLocale } from '../../../common/i18n';
import { classes } from '../../../utils/classes';
import { getFilteredTags } from '../../../utils/verb-tags';

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
