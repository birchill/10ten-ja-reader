import { WordResult, groupSenses } from '@birchill/jpdict-idb';

import { PartOfSpeechDisplay } from '../../../common/content-config-params';
import { useLocale } from '../../../common/i18n';
import { classes } from '../../../utils/classes';
import { getFilteredTags } from '../../../utils/verb-tags';

import { Sense } from './Sense';

export function Definitions({
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
        <Sense sense={senses[0]} posDisplay={options.posDisplay} />
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
              <Sense sense={sense} posDisplay={options.posDisplay} />
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
                      <Sense sense={sense} posDisplay={options.posDisplay} />
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
                <Sense sense={sense} posDisplay={options.posDisplay} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
