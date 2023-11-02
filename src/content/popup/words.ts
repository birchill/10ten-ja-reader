import {
  Gloss,
  groupSenses,
  KanjiInfo,
  LangSource,
  ReadingInfo,
} from '@birchill/jpdict-idb';
import { countMora, moraSubstring } from '@birchill/normal-jp';
import browser from 'webextension-polyfill';

import { Sense, WordResult } from '../../background/search-result';
import { NamePreview } from '../query';
import { PopupOptions, StartCopyCallback } from './popup';

import { renderMetadata } from './metadata';
import { renderName } from './names';
import { html } from '../../utils/builder';
import { getSelectedIndex } from './selected-index';
import { popupHasSelectedText } from './selection';
import { getLangTag } from './lang-tag';
import { renderStar } from './icons';
import { CopyState } from './copy-state';

export function renderWordEntries({
  entries,
  matchLen,
  more,
  namePreview,
  options,
  title,
}: {
  entries: Array<WordResult>;
  matchLen: number;
  more: boolean;
  namePreview: NamePreview | undefined;
  options: PopupOptions;
  title: string | undefined;
}): HTMLElement {
  const container = html('div', { class: 'wordlist entry-data' });

  if (title) {
    container.append(html('div', { class: 'title', lang: 'ja' }, title));
  }

  // Pre-filter metadata
  //
  // If we have word matches longer than shogi metadata we drop the shogi
  // metadata because the shogi shorthand in particular can turn up false
  // positives on words like ドクター and ドキュメンテーション.
  if (options.meta?.type === 'shogi' && matchLen >= options.meta.matchLen) {
    delete options.meta;
  }

  if (options.meta) {
    const metadata = renderMetadata({
      fxData: options.fxData,
      isCombinedResult: true,
      matchLen,
      meta: options.meta,
    });
    if (metadata) {
      container.append(metadata);
    }
  }

  const numNames = namePreview?.names.length ?? 0;
  const totalEntries = entries.length + numNames;
  const selectedIndex = getSelectedIndex(options, totalEntries);

  if (namePreview) {
    container.append(
      renderNamePreview(namePreview, {
        copyKind: options.copyState.kind,
        onStartCopy: options.onStartCopy,
        selectedIndex,
      })
    );
  }

  let lastPointerType = 'touch';
  let longestMatch = 0;

  for (const [index, entry] of entries.entries()) {
    // Work out where the fold is so we can make later entries appear in the
    // scrolled-out-of-view range.
    const matchLength = Math.max(
      ...entry.k
        .filter((k) => k.matchRange)
        .map((k) => k.matchRange![1] - k.matchRange![0]),
      ...entry.r
        .filter((r) => r.matchRange)
        .map((r) => r.matchRange![1] - r.matchRange![0]),
      0
    );
    if (matchLength < longestMatch) {
      container.append(html('div', { class: 'fold-point' }));
      // Prevent adding any more fold points
      longestMatch = -Infinity;
    } else if (!longestMatch) {
      longestMatch = matchLength;
    }

    const entryDiv = html('div', { class: 'entry' });
    container.append(entryDiv);

    if (index === selectedIndex - numNames) {
      entryDiv.classList.add(
        options.copyState.kind === 'active' ? '-selected' : '-flash'
      );
    }

    entryDiv.addEventListener('pointerup', (evt) => {
      lastPointerType = evt.pointerType;
    });

    entryDiv.addEventListener('click', () => {
      if (popupHasSelectedText(container)) {
        return;
      }

      const trigger = lastPointerType === 'mouse' ? 'mouse' : 'touch';
      options.onStartCopy?.(index + numNames, trigger);
    });

    const headingDiv = html('div', {});
    entryDiv.append(headingDiv);

    const matchedOnKana = entry.r.some((r) => r.matchRange);

    // Exclude any search-only kanji headwords unless we ONLY matched on
    // search-only kanji.
    const matchedOnlyOnSearchOnlyKanji =
      !matchedOnKana && entry.k.every((k) => !k.match || k.i?.includes('sK'));

    const kanjiHeadwords = entry.k
      ? entry.k.filter(
          (k) =>
            !k.i?.includes('sK') ||
            (matchedOnlyOnSearchOnlyKanji && k.matchRange)
        )
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
    if (matchingKanji.length) {
      const kanjiSpan = html('span', { class: 'w-kanji', lang: 'ja' });
      for (const [i, kanji] of matchingKanji.entries()) {
        if (i) {
          kanjiSpan.append(html('span', { class: 'separator' }, '、'));
        }

        let headwordSpan = kanjiSpan;
        const ki = new Set(kanji.i || []);
        if (
          // Always dim search-only kanji
          ki.has('sK') ||
          // Dim the non-matching kanji unless there are none because we
          // matched only on search-only kanji headwords.
          (!kanji.match && !matchedOnlyOnSearchOnlyKanji) ||
          // If we matched on the reading, dim any kanji headwords that are
          // irregular, old, or rare.
          (matchedOnKana && (ki.has('iK') || ki.has('oK') || ki.has('rK')))
        ) {
          const dimmedSpan = html('span', { class: 'dimmed' });
          kanjiSpan.append(dimmedSpan);
          headwordSpan = dimmedSpan;
        }

        headwordSpan.append(kanji.ent);

        appendHeadwordInfo(kanji.i, headwordSpan);
        if (options.showPriority) {
          appendPriorityMark(kanji.p, headwordSpan);
        }
        if (options.waniKaniVocabDisplay !== 'hide' && kanji.wk) {
          appendWaniKaniLevelTag(kanji.wk, headwordSpan);
        }
      }
      headingDiv.append(kanjiSpan);
    }

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
          r.i?.includes('sk')
      );

    // For search-only kanji, we show them only if they are the ONLY matches.
    const matchedOnlyOnSearchOnlyKana =
      matchedOnKana && entry.r.every((r) => !r.match || r.i?.includes('sk'));

    const matchingKana = entry.r.filter(
      (r) =>
        // Don't include search-only kana unless they are the _only_ matches
        (!r.i?.includes('sk') || matchedOnlyOnSearchOnlyKana) &&
        (r.match ||
          (matchedOnIrregularKana &&
            !r.i?.includes('ik') &&
            !r.i?.includes('ok') &&
            !r.i?.includes('sk')))
    );

    if (matchingKana.length) {
      const kanaSpan = html('span', { class: 'w-kana', lang: 'ja' });
      for (const [i, kana] of matchingKana.entries()) {
        if (i) {
          kanaSpan.append(html('span', { class: 'separator' }, '、'));
        }

        // Dim irrelevant headwords
        let headwordSpan = kanaSpan;
        if (
          // Always dim search-only headwords
          kana.i?.includes('sk') ||
          // If we looked up by kanji, dim any kana headwords that are irregular
          // or old.
          (!matchedOnKana && (kana.i?.includes('ik') || kana.i?.includes('ok')))
        ) {
          const dimmedSpan = html('span', { class: 'dimmed' });
          kanaSpan.append(dimmedSpan);
          headwordSpan = dimmedSpan;
        }

        headwordSpan.append(renderKana(kana, options));
        appendHeadwordInfo(kana.i, headwordSpan);
        if (options.showPriority) {
          appendPriorityMark(kana.p, headwordSpan);
        }
      }
      headingDiv.append(kanaSpan);
    }

    if (entry.romaji?.length) {
      headingDiv.append(
        html('span', { class: 'w-romaji', lang: 'ja' }, entry.romaji.join(', '))
      );
    }

    if (entry.reason) {
      headingDiv.append(
        html(
          'span',
          { class: 'w-conj', lang: getLangTag() },
          `(${entry.reason})`
        )
      );
    }

    if (options.showDefinitions) {
      entryDiv.append(renderDefinitions(entry, options));
    }
  }

  if (more) {
    container.append(html('div', { class: 'more' }, '…'));
  }

  return container;
}

function renderNamePreview(
  { names, more }: NamePreview,
  {
    copyKind,
    onStartCopy,
    selectedIndex,
  }: {
    copyKind: CopyState['kind'];
    onStartCopy?: StartCopyCallback;
    selectedIndex?: number;
  }
): HTMLElement {
  const container = html('div', { class: 'bonus-name' });

  let lastPointerType = 'touch';

  for (const [index, name] of names.entries()) {
    const nameEntry = renderName(name);
    if (index === selectedIndex) {
      nameEntry.classList.add(copyKind === 'active' ? '-selected' : '-flash');
    }

    nameEntry.addEventListener('pointerup', (evt) => {
      lastPointerType = evt.pointerType;
    });

    nameEntry.addEventListener('click', () => {
      if (popupHasSelectedText(container)) {
        return;
      }

      const trigger = lastPointerType === 'mouse' ? 'mouse' : 'touch';
      onStartCopy?.(index, trigger);
    });

    container.append(nameEntry);
  }

  if (more) {
    container.append(html('span', { class: 'more' }, '…'));
  }

  return container;
}

function appendHeadwordInfo(
  info: Array<string> | undefined,
  parent: ParentNode
) {
  if (!info || !info.length) {
    return;
  }

  for (const i of info) {
    const span = html(
      'span',
      { class: 'w-head-info', lang: getLangTag() },
      '('
    );

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
      uK: 'ukanji',
      rK: 'rkanji',
      // We normally don't show search-only kanji/kana headwords unless they are
      // exact matches. In those cases we should probably just indicate them as
      // "irregular" kanji/kana.
      sK: 'ikanji',
      sk: 'ikana',
    };
    const key = specialKeys.hasOwnProperty(i)
      ? specialKeys[i as KanjiInfo | ReadingInfo]
      : i;

    span.append(browser.i18n.getMessage(`head_info_label_${key}`) || i, ')');
    parent.append(span);
  }
}

function appendPriorityMark(
  priority: Array<string> | undefined,
  parent: ParentNode
) {
  if (!priority || !priority.length) {
    return;
  }

  // These are the ones that are annotated with a (P) in the EDICT file.
  const highPriorityLabels = ['i1', 'n1', 's1', 's2', 'g1'];
  let highPriority = false;
  for (const p of priority) {
    if (highPriorityLabels.includes(p)) {
      highPriority = true;
      break;
    }
  }

  parent.append(renderStar(highPriority ? 'full' : 'hollow'));
}

function appendWaniKaniLevelTag(level: number, parent: ParentNode) {
  parent.append(html('span', { class: 'wk-level' }, String(level)));
}

function renderKana(
  kana: WordResult['r'][0],
  options: PopupOptions
): string | Element {
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
      return html('span', { class: 'w-heiban' }, kana.ent);
    } else {
      return (
        moraSubstring(kana.ent, 0, accentPos) +
        'ꜜ' +
        moraSubstring(kana.ent, accentPos)
      );
    }
  }

  // Generate binary pitch display
  const wrapperSpan = html('span', { class: 'w-binary' });
  if (options.accentDisplay === 'binary-hi-contrast') {
    wrapperSpan.classList.add('-hi-contrast');
  }

  // Accent position 0 (heiban: LHHHHH) and accent position 1 (atamadaka: HLLLL)
  // are sufficiently similar that we handle them together.
  if (accentPos === 0 || accentPos === 1) {
    const len = countMora(kana.ent);
    wrapperSpan.append(
      html(
        'span',
        { class: accentPos ? 'h-l' : len > 1 ? 'l-h' : 'h' },
        moraSubstring(kana.ent, 0, 1)
      )
    );

    if (len > 1) {
      wrapperSpan.append(
        html(
          'span',
          { class: accentPos ? 'l' : 'h' },
          moraSubstring(kana.ent, 1)
        )
      );
    }
  } else {
    // Otherwise we have nakadaka (LHHHHL) or odaka (LHHHH)
    wrapperSpan.append(
      html('span', { class: 'l-h' }, moraSubstring(kana.ent, 0, 1))
    );

    wrapperSpan.append(
      html('span', { class: 'h-l' }, moraSubstring(kana.ent, 1, accentPos))
    );

    if (accentPos < countMora(kana.ent)) {
      wrapperSpan.append(
        html('span', { class: 'l' }, moraSubstring(kana.ent, accentPos))
      );
    }
  }

  return wrapperSpan;
}

function renderDefinitions(entry: WordResult, options: PopupOptions) {
  const senses = entry.s.filter((s) => s.match);
  if (!senses.length) {
    return '';
  }

  const definitionsDiv = html('div', { class: 'w-def' });

  if (senses.length === 1) {
    definitionsDiv.append(renderSense(senses[0], options));
    definitionsDiv.lang = senses[0].lang || 'en';
    if (
      options.dictLang &&
      options.dictLang !== 'en' &&
      senses[0].lang !== options.dictLang
    ) {
      definitionsDiv.classList.add('foreign');
    }
  } else {
    // First extract any native language senses
    const nativeSenses = senses.filter((s) => s.lang && s.lang !== 'en');
    if (nativeSenses.length) {
      const definitionList = html('ul', {});
      for (const sense of nativeSenses) {
        definitionList.append(
          html('li', { lang: sense.lang || 'en' }, renderSense(sense, options))
        );
      }
      definitionsDiv.append(definitionList);
    }

    // Try grouping the remaining (English) definitions by part-of-speech.
    const enSenses = senses.filter((s) => !s.lang || s.lang === 'en');
    const posGroups =
      options.posDisplay !== 'none' ? groupSenses(enSenses) : [];
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

    if (useGroups) {
      let startIndex = 1;
      for (const group of posGroups) {
        // Group heading
        const groupHeading = html('p', { class: 'w-group-head' });

        for (const pos of group.pos) {
          const posSpan = html('span', { class: 'w-pos tag' });
          if (options.posDisplay === 'expl') {
            posSpan.lang = getLangTag();
            posSpan.textContent =
              browser.i18n.getMessage(`pos_label_${pos.replace(/-/g, '_')}`) ||
              pos;
          } else {
            posSpan.textContent = pos;
          }
          groupHeading.append(posSpan);
        }

        for (const misc of group.misc) {
          groupHeading.append(
            html(
              'span',
              {
                class: 'w-misc tag',
                lang: getLangTag(),
              },
              browser.i18n.getMessage(
                `misc_label_${misc.replace(/-/g, '_')}`
              ) || misc
            )
          );
        }

        // If there is no group heading, just add a '-' placeholder
        if (!group.pos.length && !group.misc.length) {
          groupHeading.append(html('span', { class: 'w-pos tag' }, '-'));
        }

        definitionsDiv.append(groupHeading);

        // Group items
        const definitionList = html('ol', { start: String(startIndex) });
        for (const sense of group.senses) {
          definitionList.append(
            html(
              'li',
              {
                class: isForeign ? 'foreign' : undefined,
                lang: sense.lang || 'en',
              },
              renderSense(sense, options)
            )
          );
          startIndex++;
        }
        definitionsDiv.append(definitionList);
      }
    } else {
      const definitionList = html('ol', {});
      for (const sense of enSenses) {
        definitionList.append(
          html(
            'li',
            { class: isForeign ? 'foreign' : '', lang: sense.lang || 'en' },
            renderSense(sense, options)
          )
        );
      }
      definitionsDiv.append(definitionList);
    }
  }

  return definitionsDiv;
}

function renderSense(sense: Sense, options: PopupOptions): DocumentFragment {
  const fragment = document.createDocumentFragment();

  if (options.posDisplay !== 'none') {
    for (const pos of sense.pos || []) {
      const posSpan = html('span', { class: 'w-pos tag' });
      switch (options.posDisplay) {
        case 'expl':
          posSpan.lang = getLangTag();
          posSpan.append(
            browser.i18n.getMessage(`pos_label_${pos.replace(/-/g, '_')}`) ||
              pos
          );
          break;

        case 'code':
          posSpan.append(pos);
          break;
      }
      fragment.append(posSpan);
    }
  }

  if (sense.field) {
    for (const field of sense.field) {
      fragment.append(
        html(
          'span',
          { class: 'w-field tag', lang: getLangTag() },
          browser.i18n.getMessage(`field_label_${field}`) || field
        )
      );
    }
  }

  if (sense.misc) {
    for (const misc of sense.misc) {
      fragment.append(
        html(
          'span',
          { class: 'w-misc tag', lang: getLangTag() },
          browser.i18n.getMessage(`misc_label_${misc.replace(/-/g, '_')}`) ||
            misc
        )
      );
    }
  }

  if (sense.dial) {
    for (const dial of sense.dial) {
      fragment.append(
        html(
          'span',
          { class: 'w-dial tag', lang: getLangTag() },
          browser.i18n.getMessage(`dial_label_${dial}`) || dial
        )
      );
    }
  }

  appendGlosses(sense.g, fragment);

  if (sense.inf) {
    fragment.append(
      html(
        'span',
        {
          class: 'w-inf',
          // Mark inf as Japanese because it often contains Japanese text
          lang: 'ja',
        },
        ` (${sense.inf})`
      )
    );
  }

  if (sense.lsrc && sense.lsrc.length) {
    fragment.append(renderLangSources(sense.lsrc));
  }

  return fragment;
}

function appendGlosses(glosses: Array<Gloss>, parent: ParentNode) {
  for (const [i, gloss] of glosses.entries()) {
    if (i) {
      parent.append('; ');
    }

    if (gloss.type && gloss.type !== 'tm' && gloss.type !== 'none') {
      const typeStr = browser.i18n.getMessage(`gloss_type_label_${gloss.type}`);
      if (typeStr) {
        parent.append(
          html('span', { class: 'w-type', lang: getLangTag() }, `(${typeStr}) `)
        );
      }
    }

    parent.append(gloss.str);
    if (gloss.type === 'tm') {
      parent.append('™');
    }
  }
}

function renderLangSources(sources: Array<LangSource>): DocumentFragment {
  const container = document.createDocumentFragment();

  for (const lsrc of sources) {
    container.append(' ');

    let prefix = lsrc.wasei
      ? browser.i18n.getMessage('lang_label_wasei')
      : undefined;
    if (!prefix) {
      prefix =
        browser.i18n.getMessage(`lang_label_${lsrc.lang || 'en'}`) || lsrc.lang;
    }

    const wrapperSpan = html(
      'span',
      { class: 'w-lsrc', lang: getLangTag() },
      '('
    );

    if (prefix && lsrc.src) {
      prefix = `${prefix}: `;
    }
    if (prefix) {
      wrapperSpan.append(prefix);
    }

    if (lsrc.src) {
      wrapperSpan.append(html('span', { lang: lsrc.lang }, lsrc.src));
    }

    wrapperSpan.append(')');

    container.append(wrapperSpan);
  }

  return container;
}
