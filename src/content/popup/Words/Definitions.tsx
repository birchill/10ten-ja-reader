import { WordResult, groupSenses } from '@birchill/jpdict-idb';

import { PartOfSpeechDisplay } from '../../../common/content-config-params';
import { useLocale } from '../../../common/i18n';
import { classes } from '../../../utils/classes';
import { getFilteredTags } from '../../../utils/verb-tags';

import { Tag } from '../Tag';
import { usePopupOptions } from '../options-context';

import { Sense } from './Sense';

export function Definitions({
  entry,
  options,
}: {
  entry: WordResult;
  options: { dictLang?: string; posDisplay: PartOfSpeechDisplay };
}) {
  const { t, langTag } = useLocale();
  const { interactive } = usePopupOptions();

  const senses = entry.s.filter((s) => s.match);
  if (!senses.length) {
    return undefined;
  }

  if (senses.length === 1) {
    return (
      <div
        class={classes(
          'tp:text-base',
          'tp:group-data-selected:text-(--selected-def-color)',
          interactive && 'tp:group-hover:text-(--selected-def-color)',
          options.dictLang &&
            options.dictLang !== 'en' &&
            senses[0].lang !== options.dictLang &&
            'tp:opacity-85'
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
    <div
      class={classes(
        'tp:text-base',
        'tp:group-data-selected:text-(--selected-def-color)',
        interactive && 'tp:group-hover:text-(--selected-def-color)'
      )}
    >
      {nativeSenses.length > 0 && (
        <ul class="tp:pl-6 tp:m-0">
          {nativeSenses.map((sense, index) => (
            <li
              class="tp:list-[circle] tp:leading-6"
              key={index}
              lang={sense.lang || 'en'}
            >
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
              <p class="tp:mt-1 tp:mb-0.5 tp:space-x-1.5">
                {filteredPos.map((pos) => (
                  <Tag
                    key={pos}
                    tagType="pos"
                    text={
                      isExpl
                        ? t(`pos_label_${pos.replace(/-/g, '_')}`) || pos
                        : pos
                    }
                    langTag={langTag}
                  />
                ))}

                {group.misc.map((misc) => (
                  <Tag
                    key={misc}
                    tagType="misc"
                    text={t(`misc_label_${misc.replace(/-/g, '_')}`) || misc}
                    langTag={langTag}
                  />
                ))}

                {
                  // If there is no group heading, just add a '-' placeholder
                  !group.pos.length && !group.misc.length && (
                    <Tag tagType="pos" text="-" langTag={langTag} />
                  )
                }
              </p>

              {/* Group items */}
              <ol class="tp:m-0 tp:pl-6 tp:list-decimal" start={startIndex}>
                {group.senses.map((sense, index) => {
                  startIndex++;

                  return (
                    <li
                      key={index}
                      class={classes(
                        'tp:list-decimal tp:leading-6',
                        isForeign && 'tp:opacity-85'
                      )}
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
          <ol class="tp:m-0 tp:pl-6 tp:list-decimal">
            {enSenses.map((sense, index) => (
              <li
                key={index}
                class={classes(
                  'tp:list-decimal tp:leading-6',
                  isForeign && 'tp:opacity-85'
                )}
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
