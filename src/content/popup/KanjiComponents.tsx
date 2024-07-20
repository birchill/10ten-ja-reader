import type { ExpandedRadical, KanjiResult } from '@birchill/jpdict-idb';

import { useLocale } from '../../common/i18n';

export type Props = Pick<KanjiResult, 'rad' | 'comp'>;

export function KanjiComponents(props: Props) {
  const componentsIncludesRadical = props.comp.some(
    (comp) => comp.c === props.rad.b || comp.c === props.rad.k
  );

  return (
    <div class="components">
      <table>
        {/* Typically, the radical will also be one of the components, but in
         * case it's not (the data is frequently hand-edited, after all),
         * make sure we add it first. */}
        {!componentsIncludesRadical && <RadicalRow {...props.rad} />}
        {props.comp.map((comp) => {
          if (comp.c === props.rad.b || comp.c === props.rad.k) {
            return <RadicalRow key={comp.c} {...props.rad} />;
          }

          return (
            <tr key={comp.c}>
              <td class="char" lang="ja">
                {comp.c}
              </td>
              <td class="reading" lang="ja">
                {comp.na[0] || '-'}
              </td>
              <td class="meaning" lang={comp.m_lang}>
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
      <tr class="-radical">
        <td class="char" lang="ja">
          {props.b || props.k}
        </td>
        <td class="reading" lang="ja">
          {props.na.join('、')}
        </td>
        <td class="meaning" lang={props.m_lang}>
          {props.m.join(', ')}
        </td>
      </tr>
      {!!props.base && (
        <tr class="-baseradical" lang={langTag}>
          <td colspan={3}>
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
