import { KanjiInfo, ReadingInfo } from '@birchill/jpdict-idb';

import { useLocale } from '../../../common/i18n';

export function HeadwordInfo({ info }: { info: Array<string> }) {
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
      <span key={i} class="tp:ml-1 tp:text-2xs" lang={langTag}>
        ({t(`head_info_label_${key}`) || i})
      </span>
    );
  });
}
