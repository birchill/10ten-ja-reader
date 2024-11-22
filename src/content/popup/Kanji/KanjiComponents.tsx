import type { ExpandedRadical, KanjiResult } from '@birchill/jpdict-idb';

import { useLocale } from '../../../common/i18n';

export type Props = Pick<KanjiResult, 'rad' | 'comp'>;

export function KanjiComponents(props: Props) {
  const componentsIncludesRadical = props.comp.some(
    (comp) => comp.c === props.rad.b || comp.c === props.rad.k
  );

  return (
    <div>
      <table
        // There's something odd in Firefox where, when you're viewing a
        // text/plain document, the text color rule on the window doesn't
        // inherit into the table so we have to explicitly re-establish the
        // color here.
        class="-tp-mx-3 tp-border-collapse tp-text-[--text-color] tp-text-xs tp-leading-normal"
      >
        {/* Typically, the radical will also be one of the components, but in
         * case it's not (the data is frequently hand-edited, after all),
         * make sure we add it first. */}
        {!componentsIncludesRadical && <RadicalRow {...props.rad} />}
        {props.comp.map((comp) => {
          if (comp.c === props.rad.b || comp.c === props.rad.k) {
            return <RadicalRow key={comp.c} {...props.rad} />;
          }

          return (
            <tr key={comp.c} class="*:tp-align-top *:tp-py-1">
              <td class="tp-px-3" lang="ja">
                {comp.c}
              </td>
              <td class="tp-px-1.5" lang="ja">
                {comp.na[0] || '-'}
              </td>
              <td class="tp-px-3" lang={comp.m_lang}>
                {comp.m[0] || '-'}
              </td>
            </tr>
          );
        })}
      </table>
    </div>
  );
}

function RadicalRow(props: ExpandedRadical) {
  const { t, langTag } = useLocale();

  return (
    <>
      <tr class="*:tp-bg-[--cell-highlight-bg] *:tp-text-[--cell-highlight-fg] *:tp-align-top *:tp-py-1">
        <td class="tp-px-3 tp-rounded-s-md" lang="ja">
          {props.b || props.k}
        </td>
        <td class="tp-px-1.5" lang="ja">
          {props.na.join('、')}
        </td>
        <td class="tp-px-3 tp-rounded-e-md" lang={props.m_lang}>
          {props.m.join(', ')}
        </td>
      </tr>
      {!!props.base && (
        <tr class="-baseradical" lang={langTag}>
          <td
            colspan={3}
            class="tp-text-[--cell-highlight-fg] tp-align-top tp-py-1 tp-px-3 tp-italic"
          >
            {t('content_kanji_base_radical', [
              (props.base.b || props.base.k)!,
              props.base.na.join('、'),
            ])}
          </td>
        </tr>
      )}
    </>
  );
}
