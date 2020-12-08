import { KanjiResult, NameTranslation } from '@birchill/hikibiki-data';
import { countMora, moraSubstring } from '@birchill/normal-jp';

import {
  CopyKeys,
  CopyType,
  CopyKanjiKeyStrings,
  CopyNextKeyStrings,
} from './copy-keys';
import { groupSenses } from './grouping';
import { getHash } from './hash';
import { SelectionMeta } from './meta';
import { QueryResult } from './query';
import {
  getReferenceValue,
  getSelectedReferenceLabels,
  ReferenceAbbreviation,
} from './refs';
import { isForeignObjectElement, isSvgDoc, SVG_NS } from './svg';
import {
  ExtendedKanaEntry,
  ExtendedSense,
  Gloss,
  GlossType,
  KanjiInfo,
  LangSource,
  ReadingInfo,
} from './word-result';
import { EraInfo, getEraInfo } from './years';

import popupStyles from '../css/popup.css';

export const enum CopyState {
  Inactive,
  Active,
  Finished,
  Error,
}

export interface PopupOptions {
  accentDisplay: AccentDisplay;
  container?: HTMLElement;
  // Set when copyState !== CopyState.Inactive
  copyIndex?: number;
  copyNextKey: string;
  copyState?: CopyState;
  // Set when copyState === CopyState.Finished
  copyType?: CopyType;
  document?: Document;
  kanjiReferences: Array<ReferenceAbbreviation>;
  meta?: SelectionMeta;
  posDisplay: PartOfSpeechDisplay;
  popupStyle: string;
  showDefinitions: boolean;
  showPriority: boolean;
  showKanjiComponents?: boolean;
}

export function renderPopup(
  result: QueryResult,
  options: PopupOptions
): HTMLElement {
  const doc = options.document || document;
  const container = options.container || getDefaultContainer(doc);
  const windowElem = resetContainer(container, {
    document: doc,
    popupStyle: options.popupStyle,
  });

  // TODO: We should use `options.document` everywhere in this file and in
  // the other methods too.

  switch (result.type) {
    case 'kanji':
      windowElem.append(renderKanjiEntry(result.data, options));
      break;

    case 'names':
      windowElem.append(renderNamesEntries(result.data, result.more, options));
      break;

    default:
      windowElem.append(
        renderWordEntries(
          result.data,
          result.names,
          result.moreNames,
          result.title,
          result.more,
          options
        )
      );
      break;
  }

  return container;
}

function getDefaultContainer(doc: Document): HTMLElement {
  // Look for an existing container
  const existingContainers = doc.querySelectorAll('#rikaichamp-window');
  if (existingContainers.length) {
    // Drop any duplicate containers
    while (existingContainers.length > 1) {
      existingContainers[1].remove();
    }
    return existingContainers[0] as HTMLElement;
  }

  // Create a new container

  // For SVG documents we put container <div> inside a <foreignObject>.
  let parent: Element;
  if (isSvgDoc(doc)) {
    const foreignObject = doc.createElementNS(SVG_NS, 'foreignObject');
    foreignObject.setAttribute('width', '600');
    foreignObject.setAttribute('height', '100%');
    doc.documentElement.append(foreignObject);
    parent = foreignObject;
  } else {
    parent = doc.documentElement;
  }

  // Actually create the container element
  const container = doc.createElement('div');
  container.id = 'rikaichamp-window';
  parent.append(container);

  // Apply minimal container styles
  //
  // All the interesting styles go on the inner 'window' object. The styles here
  // are just used for positioning the pop-up correctly.
  //
  // First reset all styles the page may have applied.
  container.style.all = 'initial';
  container.style.position = 'absolute';
  // asahi.com puts z-index: 1000000 on its banner ads. We go one better.
  container.style.zIndex = '1000001';

  // Set initial position
  container.style.top = '5px';
  container.style.left = '5px';
  container.style.minWidth = '100px';

  // Make sure the container too doesn't receive pointer events
  container.style.pointerEvents = 'none';

  return container;
}

function resetContainer(
  container: HTMLElement,
  { document: doc, popupStyle }: { document: Document; popupStyle: string }
): HTMLElement {
  if (!container.shadowRoot) {
    container.attachShadow({ mode: 'open' });

    // Add <style>
    const style = doc.createElement('style');
    style.textContent = popupStyles;
    style.dataset.hash = getStyleHash();
    container.shadowRoot!.append(style);
  } else {
    // Reset content
    for (const child of container.shadowRoot!.children) {
      if (child.tagName !== 'STYLE') {
        child.remove();
      }
    }

    // Reset style
    let existingStyle = container.shadowRoot.querySelector('style');
    if (existingStyle && existingStyle.dataset.hash !== getStyleHash()) {
      existingStyle.remove();
      existingStyle = null;
    }

    if (!existingStyle) {
      const style = doc.createElement('style');
      style.textContent = popupStyles;
      style.dataset.hash = getStyleHash();
      container.shadowRoot!.append(style);
    }
  }

  const windowDiv = doc.createElement('div');
  windowDiv.classList.add('window', `-${popupStyle}`);
  container.shadowRoot!.append(windowDiv);

  return windowDiv;
}

let styleHash: string | undefined;

function getStyleHash(): string {
  if (!styleHash) {
    styleHash = getHash(popupStyles.toString());
  }

  return styleHash;
}

export function isPopupVisible(): boolean {
  const popup = document.getElementById('rikaichamp-window');
  if (!popup || !popup.shadowRoot) {
    return false;
  }

  const windowElem = popup.shadowRoot.querySelector('.window');
  return !!windowElem && !windowElem.classList.contains('hidden');
}

export function hidePopup() {
  const popup = document.getElementById('rikaichamp-window');
  if (!popup || !popup.shadowRoot) {
    return;
  }

  const windowElem = popup.shadowRoot.querySelector('.window');
  if (windowElem) {
    windowElem.classList.add('hidden');
  }
}

export function removePopup() {
  let popup = document.getElementById('rikaichamp-window');
  while (popup) {
    // If we are in an SVG document, remove the wrapping <foreignObject>.
    if (isForeignObjectElement(popup.parentElement)) {
      popup.parentElement.remove();
    } else {
      popup.remove();
    }
    popup = document.getElementById('rikaichamp-window');
  }
}

export function setPopupStyle(style: string) {
  const popup = document.getElementById('rikaichamp-window');
  if (!popup || !popup.shadowRoot) {
    return;
  }

  const windowElem = popup.shadowRoot.querySelector('.window');
  if (!windowElem) {
    return;
  }

  for (const className of windowElem.classList.values()) {
    if (className.startsWith('-')) {
      windowElem.classList.remove(className);
    }
  }

  windowElem.classList.add(`-${style}`);
}

function renderWordEntries(
  entries: Array<WordResult>,
  names: Array<NameResult> | undefined,
  moreNames: boolean | undefined,
  title: string | undefined,
  more: boolean,
  options: PopupOptions
): HTMLElement {
  const container = document.createElement('div');
  container.classList.add('wordlist');

  if (title) {
    const titleDiv = document.createElement('div');
    container.append(titleDiv);
    titleDiv.classList.add('title');
    titleDiv.lang = 'ja';
    titleDiv.append(title);
  }

  if (options.meta) {
    const eraInfo = getEraInfo(options.meta.era);
    if (eraInfo) {
      container.append(renderEraInfo(options.meta, eraInfo));
    }
  }

  if (names) {
    container.append(renderBonusNames(names, moreNames));
  }

  let index = 0;
  const selectedIndex = getSelectedIndex(options, entries.length);
  for (const entry of entries) {
    const entryDiv = document.createElement('div');
    container.append(entryDiv);

    entryDiv.classList.add('entry');
    if (index === selectedIndex) {
      entryDiv.classList.add(
        options.copyState === CopyState.Active ? '-selected' : '-flash'
      );
    }
    index++;

    const headingDiv = document.createElement('div');
    entryDiv.append(headingDiv);

    // Sort matched kanji entries first
    const sortedKanji = entry.k
      ? [...entry.k].sort((a, b) => Number(b.match) - Number(a.match))
      : [];
    if (sortedKanji.length) {
      const kanjiSpan = document.createElement('span');
      kanjiSpan.classList.add('w-kanji');
      kanjiSpan.lang = 'ja';
      for (const [i, kanji] of sortedKanji.entries()) {
        if (i) {
          const commaSpan = document.createElement('span');
          commaSpan.classList.add('w-separator');
          commaSpan.textContent = '、';
          kanjiSpan.append(commaSpan);
        }

        let headwordSpan = kanjiSpan;
        if (!kanji.match) {
          const dimmedSpan = document.createElement('span');
          dimmedSpan.classList.add('w-unmatched');
          kanjiSpan.append(dimmedSpan);
          headwordSpan = dimmedSpan;
        }

        headwordSpan.append(kanji.ent);

        appendHeadwordInfo(kanji.i, headwordSpan);
        if (options.showPriority) {
          appendPriorityMark(kanji.p, headwordSpan);
        }
      }
      headingDiv.append(kanjiSpan);
    }

    const matchingKana = entry.r.filter((r) => r.match);
    if (matchingKana.length) {
      const kanaSpan = document.createElement('span');
      kanaSpan.classList.add('w-kana');
      kanaSpan.lang = 'ja';
      for (const [i, kana] of matchingKana.entries()) {
        if (i) {
          kanaSpan.append('、 ');
        }
        kanaSpan.append(renderKana(kana, options));
        appendHeadwordInfo(kana.i, kanaSpan);
        if (options.showPriority) {
          appendPriorityMark(kana.p, kanaSpan);
        }
      }
      headingDiv.append(kanaSpan);
    }

    if (entry.romaji?.length) {
      const romajiSpan = document.createElement('span');
      romajiSpan.classList.add('w-romaji');
      romajiSpan.lang = 'ja';
      romajiSpan.append(entry.romaji.join(', '));
      headingDiv.append(romajiSpan);
    }

    if (entry.reason) {
      const reasonSpan = document.createElement('span');
      headingDiv.append(reasonSpan);
      reasonSpan.lang = getLangTag();
      reasonSpan.classList.add('w-conj');
      reasonSpan.append(`(${entry.reason})`);
    }

    if (options.showDefinitions) {
      entryDiv.append(renderDefinitions(entry, options));
    }
  }

  if (more) {
    const moreDiv = document.createElement('div');
    moreDiv.classList.add('more');
    moreDiv.append('...');
    container.append(moreDiv);
  }

  const copyDetails = renderCopyDetails(
    options.copyNextKey,
    options.copyState,
    typeof options.copyType !== 'undefined' ? options.copyType : undefined
  );
  if (copyDetails) {
    container.append(copyDetails);
  }

  return container;
}

function renderEraInfo(meta: SelectionMeta, eraInfo: EraInfo): HTMLElement {
  const metaDiv = document.createElement('div');
  metaDiv.classList.add('meta');
  metaDiv.lang = 'ja';

  const eraSpan = document.createElement('span');
  eraSpan.classList.add('era');

  const rubyBase = document.createElement('ruby');
  rubyBase.append(meta.era);

  const rpOpen = document.createElement('rp');
  rpOpen.append('(');
  rubyBase.append(rpOpen);

  const rubyText = document.createElement('rt');
  rubyText.append(eraInfo.reading);
  rubyBase.append(rubyText);

  const rpClose = document.createElement('rp');
  rpClose.append(')');
  rubyBase.append(rpClose);
  eraSpan.append(rubyBase);

  if (meta.year === 0) {
    eraSpan.append('元年');
  } else {
    eraSpan.append(`${meta.year}年`);
  }
  metaDiv.append(eraSpan);

  const equalsSpan = document.createElement('span');
  equalsSpan.classList.add('equals');
  equalsSpan.append('=');
  metaDiv.append(equalsSpan);

  const seirekiSpan = document.createElement('span');
  seirekiSpan.classList.add('seireki');
  const seireki =
    meta.year === 0 ? eraInfo.start : meta.year - 1 + eraInfo.start;
  seirekiSpan.append(`${seireki}年`);
  metaDiv.append(seirekiSpan);

  return metaDiv;
}

function renderBonusNames(
  names: Array<NameResult>,
  moreNames?: boolean
): HTMLElement {
  const container = document.createElement('div');
  container.classList.add('bonus-name');

  for (const name of names) {
    container.append(renderName(name));
  }

  if (moreNames) {
    const moreSpan = document.createElement('span');
    moreSpan.classList.add('more');
    moreSpan.append('…');
    container.append(moreSpan);
  }

  return container;
}

function renderKana(
  kana: ExtendedKanaEntry,
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
      const wrapperSpan = document.createElement('span');
      wrapperSpan.classList.add('w-heiban');
      wrapperSpan.textContent = kana.ent;
      return wrapperSpan;
    } else {
      return (
        moraSubstring(kana.ent, 0, accentPos) +
        'ꜜ' +
        moraSubstring(kana.ent, accentPos)
      );
    }
  }

  // Generate binary pitch display
  const wrapperSpan = document.createElement('span');
  wrapperSpan.classList.add('w-binary');

  // Accent position 0 (heiban: LHHHHH) and accent position 1 (atamadata: HLLLL)
  // are sufficiently similar that we handle them together.
  if (accentPos === 0 || accentPos === 1) {
    const len = countMora(kana.ent);
    const startSpan = document.createElement('span');
    startSpan.classList.add(accentPos ? 'h-l' : len > 1 ? 'l-h' : 'h');
    startSpan.textContent = moraSubstring(kana.ent, 0, 1);
    wrapperSpan.append(startSpan);

    if (len > 1) {
      const endSpan = document.createElement('span');
      endSpan.classList.add(accentPos ? 'l' : 'h');
      endSpan.textContent = moraSubstring(kana.ent, 1);
      wrapperSpan.append(endSpan);
    }
  } else {
    // Otherwise we have nakadaka (LHHHHL) or odaka (LHHHH)
    const startSpan = document.createElement('span');
    startSpan.classList.add('l-h');
    startSpan.textContent = moraSubstring(kana.ent, 0, 1);
    wrapperSpan.append(startSpan);

    const middleSpan = document.createElement('span');
    middleSpan.classList.add('h-l');
    middleSpan.textContent = moraSubstring(kana.ent, 1, accentPos);
    wrapperSpan.append(middleSpan);

    if (accentPos < countMora(kana.ent)) {
      const endSpan = document.createElement('span');
      endSpan.classList.add('l');
      endSpan.textContent = moraSubstring(kana.ent, accentPos);
      wrapperSpan.append(endSpan);
    }
  }

  return wrapperSpan;
}

function appendHeadwordInfo(
  info: Array<KanjiInfo> | Array<ReadingInfo> | undefined,
  parent: ParentNode
) {
  if (!info || !info.length) {
    return;
  }

  for (const i of info) {
    const span = document.createElement('span');
    span.classList.add('w-head-info');
    span.lang = getLangTag();
    span.append('(');

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
    };
    const key = specialKeys.hasOwnProperty(i) ? specialKeys[i] : i;

    span.append(browser.i18n.getMessage(`head_info_label_${key}`) || i);
    span.append(')');
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

function renderStar(style: 'full' | 'hollow'): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('svgicon');
  svg.style.opacity = '0.5';
  svg.setAttribute('viewBox', '0 0 98.6 93.2');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    style === 'full'
      ? 'M98 34a4 4 0 00-3-1l-30-4L53 2a4 4 0 00-7 0L33 29 4 33a4 4 0 00-3 6l22 20-6 29a4 4 0 004 5 4 4 0 002 0l26-15 26 15a4 4 0 002 0 4 4 0 004-4 4 4 0 000-1l-6-29 22-20a4 4 0 001-5z'
      : 'M77 93a4 4 0 004-4 4 4 0 000-1l-6-29 22-20a4 4 0 00-2-6l-30-4L53 2a4 4 0 00-7 0L33 29 4 33a4 4 0 00-3 6l22 20-6 29a4 4 0 004 5 4 4 0 002 0l26-15 26 15a4 4 0 002 0zm-5-12L51 70a4 4 0 00-4 0L27 81l5-22a4 4 0 00-1-4L13 40l23-3a4 4 0 004-2l9-21 10 21a4 4 0 003 2l23 3-17 15a4 4 0 00-1 4z'
  );
  svg.append(path);

  return svg;
}

function renderDefinitions(entry: WordResult, options: PopupOptions) {
  const definitionsDiv = document.createElement('div');
  definitionsDiv.classList.add('w-def');
  // Currently all definitions are in English
  definitionsDiv.lang = 'en';

  if (entry.s.length === 1) {
    definitionsDiv.append(renderSense(entry.s[0], options));
  } else {
    // Try grouping the definitions by part-of-speech.
    const posGroups = options.posDisplay !== 'none' ? groupSenses(entry.s) : [];

    // Determine if the grouping makes sense
    //
    // If the group headings make the number of lines used to represent
    // all the senses (ignoring word wrapping) grow by more than 50%, we should
    // skip using groups. This will typically be the case where there are no
    // common parts-of-speech, or at least very few.
    const linesWithGrouping = posGroups.length + entry.s.length;
    const linesWithoutGrouping = entry.s.length;
    const useGroups =
      posGroups.length && linesWithGrouping / linesWithoutGrouping <= 1.5;

    if (useGroups) {
      let startIndex = 1;
      for (const group of posGroups) {
        // Group heading
        const groupHeading = document.createElement('p');
        groupHeading.classList.add('w-group-head');

        for (const pos of group.pos) {
          const posSpan = document.createElement('span');
          posSpan.classList.add('w-pos', 'tag');
          if (options.posDisplay === 'expl') {
            posSpan.lang = getLangTag();
            posSpan.textContent =
              browser.i18n.getMessage(`pos_label_${pos}`) || pos;
          } else {
            posSpan.textContent = pos;
          }
          groupHeading.append(posSpan);
        }

        for (const misc of group.misc) {
          const miscSpan = document.createElement('span');
          miscSpan.classList.add('w-misc', 'tag');
          miscSpan.lang = getLangTag();
          miscSpan.textContent =
            browser.i18n.getMessage(`misc_label_${misc}`) || misc;
          groupHeading.append(miscSpan);
        }

        // If there is no group heading, just add a '-' placeholder
        if (!group.pos.length && !group.misc.length) {
          const posSpan = document.createElement('span');
          posSpan.classList.add('w-pos', 'tag');
          posSpan.textContent = '-';
          groupHeading.append(posSpan);
        }

        definitionsDiv.append(groupHeading);

        // Group items
        const definitionList = document.createElement('ol');
        definitionList.start = startIndex;
        for (const sense of group.senses) {
          const listItem = document.createElement('li');
          listItem.append(renderSense(sense, options));
          definitionList.append(listItem);
          startIndex++;
        }
        definitionsDiv.append(definitionList);
      }
    } else {
      const definitionList = document.createElement('ol');
      for (const sense of entry.s) {
        const listItem = document.createElement('li');
        listItem.append(renderSense(sense, options));
        definitionList.append(listItem);
      }
      definitionsDiv.append(definitionList);
    }
  }

  return definitionsDiv;
}

function renderSense(
  sense: ExtendedSense,
  options: PopupOptions
): string | DocumentFragment {
  const fragment = document.createDocumentFragment();

  if (options.posDisplay !== 'none') {
    for (const pos of sense.pos || []) {
      const posSpan = document.createElement('span');
      posSpan.classList.add('w-pos', 'tag');
      switch (options.posDisplay) {
        case 'expl':
          posSpan.lang = getLangTag();
          posSpan.append(browser.i18n.getMessage(`pos_label_${pos}`) || pos);
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
      const fieldSpan = document.createElement('span');
      fieldSpan.classList.add('w-field', 'tag');
      fieldSpan.lang = getLangTag();
      fieldSpan.textContent =
        browser.i18n.getMessage(`field_label_${field}`) || field;
      fragment.append(fieldSpan);
    }
  }

  if (sense.misc) {
    for (const misc of sense.misc) {
      const miscSpan = document.createElement('span');
      miscSpan.classList.add('w-misc', 'tag');
      miscSpan.lang = getLangTag();
      miscSpan.textContent =
        browser.i18n.getMessage(`misc_label_${misc}`) || misc;
      fragment.append(miscSpan);
    }
  }

  if (sense.dial) {
    for (const dial of sense.dial) {
      const dialSpan = document.createElement('span');
      dialSpan.classList.add('w-dial', 'tag');
      dialSpan.lang = getLangTag();
      dialSpan.textContent =
        browser.i18n.getMessage(`dial_label_${dial}`) || dial;
      fragment.append(dialSpan);
    }
  }

  appendGlosses(sense.g, fragment);

  if (sense.inf) {
    const infSpan = document.createElement('span');
    infSpan.classList.add('w-inf');
    // Mark inf as Japanese because it often contains Japanese text
    infSpan.lang = 'ja';
    infSpan.textContent = ` (${sense.inf})`;
    fragment.append(infSpan);
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

    if (gloss.type) {
      const typeCode = {
        [GlossType.Expl]: 'expl',
        [GlossType.Fig]: 'fig',
        [GlossType.Lit]: 'lit',
      }[gloss.type];
      const typeStr = typeCode
        ? browser.i18n.getMessage(`gloss_type_label_${typeCode}`)
        : '';
      if (typeStr) {
        const typeSpan = document.createElement('span');
        typeSpan.classList.add('w-type');
        typeSpan.lang = getLangTag();
        typeSpan.textContent = `(${typeStr}) `;
        parent.append(typeSpan);
      }
    }

    parent.append(gloss.str);
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

    const wrapperSpan = document.createElement('span');
    wrapperSpan.classList.add('w-lsrc');
    wrapperSpan.lang = getLangTag();
    wrapperSpan.append('(');

    if (prefix && lsrc.src) {
      prefix = `${prefix}: `;
    }
    if (prefix) {
      wrapperSpan.append(prefix);
    }

    if (lsrc.src) {
      const sourceSpan = document.createElement('span');
      if (lsrc.lang) {
        sourceSpan.lang = lsrc.lang;
      }
      sourceSpan.textContent = lsrc.src;
      wrapperSpan.append(sourceSpan);
    }

    wrapperSpan.append(')');

    container.append(wrapperSpan);
  }

  return container;
}

function renderNamesEntries(
  entries: Array<NameResult>,
  more: boolean,
  options: PopupOptions
): HTMLElement {
  const container = document.createElement('div');

  const titleDiv = document.createElement('div');
  container.append(titleDiv);
  titleDiv.classList.add('title');
  titleDiv.lang = getLangTag();
  titleDiv.append(browser.i18n.getMessage('content_names_dictionary'));

  const namesTable = document.createElement('div');
  container.append(namesTable);
  namesTable.classList.add('name-table');

  if (entries.length > 4) {
    namesTable.classList.add('-multicol');
  }

  let index = 0;
  const selectedIndex = getSelectedIndex(options, entries.length);
  for (const entry of entries) {
    const entryDiv = renderName(entry);
    if (index === selectedIndex) {
      entryDiv.classList.add(
        options.copyState === CopyState.Active ? '-selected' : '-flash'
      );
    }
    index++;

    namesTable.append(entryDiv);
  }

  if (more) {
    const moreDiv = document.createElement('div');
    moreDiv.classList.add('more');
    moreDiv.append('...');
    namesTable.append(moreDiv);
  }

  const copyDetails = renderCopyDetails(
    options.copyNextKey,
    options.copyState,
    typeof options.copyType !== 'undefined' ? options.copyType : undefined
  );
  if (copyDetails) {
    container.append(copyDetails);
  }

  return container;
}

function renderName(entry: NameResult): HTMLElement {
  const entryDiv = document.createElement('div');
  entryDiv.classList.add('entry');

  const entryTitleDiv = document.createElement('div');
  entryTitleDiv.classList.add('w-title');
  entryTitleDiv.lang = 'ja';
  entryDiv.append(entryTitleDiv);

  if (entry.k) {
    const MAX_KANJI = 15;
    const trimKanji = entry.k.length > MAX_KANJI;
    const kanjiToDisplay = trimKanji ? entry.k.slice(0, MAX_KANJI) : entry.k;
    let kanji = kanjiToDisplay.join('、');
    if (trimKanji) {
      kanji += '…';
    }

    const kanjiSpan = document.createElement('span');
    entryTitleDiv.append(kanjiSpan);
    kanjiSpan.classList.add('w-kanji');
    kanjiSpan.append(kanji);
  }

  const kana = entry.r.join('、');
  const kanaSpan = document.createElement('span');
  entryTitleDiv.append(kanaSpan);
  kanaSpan.classList.add('w-kana');
  kanaSpan.append(kana);

  const definitionBlock = document.createElement('div');
  definitionBlock.classList.add('w-def');
  for (const tr of entry.tr) {
    definitionBlock.append(renderNameTranslation(tr));
  }
  entryDiv.append(definitionBlock);

  return entryDiv;
}

function renderNameTranslation(tr: NameTranslation): HTMLSpanElement {
  const definitionSpan = document.createElement('div');
  // ENAMDICT only has English glosses
  definitionSpan.lang = 'en';
  definitionSpan.append(tr.det.join(', '));

  for (const tag of tr.type || []) {
    const tagText = browser.i18n.getMessage(`content_names_tag_${tag}`);
    if (!tagText) {
      continue;
    }

    const tagSpan = document.createElement('span');
    tagSpan.classList.add('tag');
    tagSpan.classList.add(`tag-${tag}`);
    tagSpan.lang = getLangTag();
    tagSpan.append(tagText);
    definitionSpan.append(tagSpan);
  }

  return definitionSpan;
}

function getSelectedIndex(options: PopupOptions, numEntries: number) {
  return typeof options.copyState !== 'undefined' &&
    options.copyState !== CopyState.Inactive &&
    typeof options.copyIndex !== 'undefined' &&
    numEntries
    ? options.copyIndex % numEntries
    : -1;
}

function renderKanjiEntry(
  entry: KanjiResult,
  options: PopupOptions
): HTMLElement | DocumentFragment {
  const container = document.createDocumentFragment();

  // Main table
  const table = document.createElement('div');
  container.append(table);
  table.classList.add('kanji-table');

  if (options.copyState === CopyState.Active) {
    table.classList.add('-copy');
  } else if (
    options.copyState === CopyState.Finished ||
    options.copyState === CopyState.Error
  ) {
    table.classList.add('-finished');
  }

  // Top part
  const topPart = document.createElement('div');
  topPart.classList.add('top-part');
  table.append(topPart);

  // -- The kanji itself
  const kanjiDiv = document.createElement('div');
  kanjiDiv.classList.add('kanji');
  kanjiDiv.lang = 'ja';
  kanjiDiv.append(entry.c);
  topPart.append(kanjiDiv);

  // -- Top-right part
  const topRightPart = document.createElement('div');
  topPart.append(topRightPart);

  // -- -- Readings
  topRightPart.append(renderReadings(entry));

  // -- -- Meta
  if (entry.misc.meta) {
    topRightPart.append(renderMeta(entry.misc.meta));
  }

  // -- -- Meanings
  const meaningsDiv = document.createElement('div');
  meaningsDiv.classList.add('meanings');
  meaningsDiv.lang = entry.m_lang;
  meaningsDiv.append(entry.m.join(', '));
  topRightPart.append(meaningsDiv);

  // -- -- Misc info
  topRightPart.append(renderMiscRow(entry));

  // -- -- Kanji components
  if (
    typeof options.showKanjiComponents === 'undefined' ||
    options.showKanjiComponents
  ) {
    topRightPart.append(renderKanjiComponents(entry));
  }

  // Reference row
  if (options.kanjiReferences && options.kanjiReferences.length) {
    table.append(renderReferences(entry, options));
  }

  // Copy details
  const copyDetails = renderCopyDetails(
    options.copyNextKey,
    options.copyState,
    typeof options.copyType !== 'undefined' ? options.copyType : undefined,
    {
      kanji: true,
    }
  );
  if (copyDetails) {
    container.append(copyDetails);
  }

  return container;
}

function renderKanjiComponents(entry: KanjiResult): HTMLElement {
  const componentsDiv = document.createElement('div');
  componentsDiv.classList.add('components');

  const componentsTable = document.createElement('table');
  componentsDiv.append(componentsTable);

  // The radical row is special. It has special highlighting, we show all
  // readings and meanings (not just the first of each), and we also show
  // the base radical, if any.
  const addRadicalRow = () => {
    const { rad } = entry;

    const row = document.createElement('tr');
    row.classList.add('-radical');
    componentsTable.append(row);

    const radicalCell = document.createElement('td');
    row.append(radicalCell);
    radicalCell.classList.add('char');
    radicalCell.append((rad.b || rad.k)!);
    radicalCell.lang = 'ja';

    const readingCell = document.createElement('td');
    row.append(readingCell);
    readingCell.classList.add('reading');
    readingCell.append(rad.na.join('、'));
    readingCell.lang = 'ja';

    const meaningCell = document.createElement('td');
    row.append(meaningCell);
    meaningCell.classList.add('meaning');
    meaningCell.lang = rad.m_lang;
    meaningCell.append(rad.m.join(', '));

    if (rad.base) {
      const baseRow = document.createElement('tr');
      baseRow.classList.add('-baseradical');
      baseRow.lang = getLangTag();
      componentsTable.append(baseRow);

      const baseChar = (rad.base.b || rad.base.k)!;
      const baseReadings = rad.base.na.join('、');
      const fromText = browser.i18n.getMessage('content_kanji_base_radical', [
        baseChar,
        baseReadings,
      ]);

      const baseCell = document.createElement('td');
      baseCell.setAttribute('colspan', '3');
      baseCell.innerText = fromText;
      baseRow.append(baseCell);
    }
  };

  // Typically, the radical will also be one of the components, but in case it's
  // not (the data is frequently hand-edited, after all), make sure we add it
  // first.
  if (
    !entry.comp.some((comp) => comp.c === entry.rad.b || comp.c === entry.rad.k)
  ) {
    addRadicalRow();
  }

  for (const component of entry.comp) {
    if (component.c === entry.rad.b || component.c === entry.rad.k) {
      addRadicalRow();
      continue;
    }

    const row = document.createElement('tr');
    componentsTable.append(row);

    const radicalCell = document.createElement('td');
    row.append(radicalCell);
    radicalCell.classList.add('char');
    radicalCell.lang = 'ja';
    radicalCell.append(component.c);

    const readingCell = document.createElement('td');
    row.append(readingCell);
    readingCell.classList.add('reading');
    readingCell.lang = 'ja';
    readingCell.append(component.na.length ? component.na[0] : '-');

    const meaningCell = document.createElement('td');
    row.append(meaningCell);
    meaningCell.classList.add('meaning');
    meaningCell.lang = component.m_lang;
    meaningCell.append(component.m.length ? component.m[0] : '-');
  }

  return componentsDiv;
}

function renderReadings(entry: KanjiResult): HTMLElement {
  // Readings
  const readingsDiv = document.createElement('div');
  readingsDiv.classList.add('readings');
  readingsDiv.lang = 'ja';

  if (entry.r.on && entry.r.on.length) {
    readingsDiv.append(entry.r.on.join('、'));
  }

  // Kun readings sometimes have a . in them separating the initial part that
  // represents the kanji, from the okurigana.
  //
  // e.g. あた.える
  //
  // We want to take the bit after the '.' and wrap it in a span with an
  // appropriate class.
  let hasPrecedingEntries = entry.r.on && entry.r.on.length !== 0;
  for (const reading of entry.r.kun || []) {
    if (hasPrecedingEntries) {
      readingsDiv.append('、');
    }

    const highlightIndex = reading.indexOf('.');
    if (highlightIndex === -1) {
      readingsDiv.append(reading);
    } else {
      readingsDiv.append(reading.substr(0, highlightIndex));
      const okuriganaSpan = document.createElement('span');
      okuriganaSpan.classList.add('okurigana');
      okuriganaSpan.append(reading.substr(highlightIndex + 1));
      readingsDiv.append(okuriganaSpan);
    }

    hasPrecedingEntries = true;
  }

  // Name readings
  if (entry.r.na && entry.r.na.length) {
    const nanoriLabelSpan = document.createElement('span');
    nanoriLabelSpan.classList.add('nanorilabel');
    nanoriLabelSpan.lang = getLangTag();
    nanoriLabelSpan.append(
      browser.i18n.getMessage('content_kanji_nanori_label')
    );
    readingsDiv.append(
      document.createElement('br'),
      nanoriLabelSpan,
      ` ${entry.r.na.join('、')}`
    );
  }

  return readingsDiv;
}

function renderMeta(meta: Array<string>): HTMLElement {
  const metaDiv = document.createElement('div');
  metaDiv.classList.add('meta');

  for (const tag of meta) {
    const span = document.createElement('span');
    span.classList.add('tag');
    span.lang = getLangTag();
    span.textContent = browser.i18n.getMessage(
      `content_kanji_meta_${tag.replace(' ', '_')}`
    );
    metaDiv.append(span);
  }

  return metaDiv;
}

function renderMiscRow(entry: KanjiResult): HTMLElement {
  // Misc information row
  const miscInfoDiv = document.createElement('div');
  miscInfoDiv.classList.add('misc');
  miscInfoDiv.lang = getLangTag();

  // Strokes
  const strokesDiv = document.createElement('div');
  strokesDiv.classList.add('strokes');
  strokesDiv.append(renderBrush());
  const strokeCount = document.createElement('span');
  strokeCount.textContent =
    entry.misc.sc === 1
      ? browser.i18n.getMessage('content_kanji_strokes_label_1')
      : browser.i18n.getMessage('content_kanji_strokes_label', [
          String(entry.misc.sc),
        ]);
  strokesDiv.append(strokeCount);
  miscInfoDiv.append(strokesDiv);

  // Frequency
  const frequencyDiv = document.createElement('div');
  frequencyDiv.classList.add('freq');
  frequencyDiv.append(renderFrequency(entry.misc.freq));
  const frequency = document.createElement('span');
  if (entry.misc.freq) {
    frequency.textContent =
      browser.i18n.getMessage('content_kanji_frequency_label') +
      ` ${entry.misc.freq.toLocaleString()}`;
    const denominator = document.createElement('span');
    denominator.classList.add('denom');
    denominator.append(` / ${Number(2500).toLocaleString()}`);
    frequency.append(denominator);
  } else {
    frequency.textContent = '-';
  }
  frequencyDiv.append(frequency);
  miscInfoDiv.append(frequencyDiv);

  // Grade
  const gradeDiv = document.createElement('div');
  gradeDiv.classList.add('grade');
  gradeDiv.append(renderUser());
  const grade = document.createElement('span');
  switch (entry.misc.gr || 0) {
    case 8:
      grade.append(browser.i18n.getMessage('content_kanji_grade_general_use'));
      break;
    case 9:
      grade.append(browser.i18n.getMessage('content_kanji_grade_name_use'));
      break;
    default:
      if (typeof entry.misc.gr === 'undefined') {
        grade.append('-');
      } else {
        grade.append(
          browser.i18n.getMessage('content_kanji_grade_label', [
            String(entry.misc.gr),
          ])
        );
      }
      break;
  }
  gradeDiv.append(grade);
  miscInfoDiv.append(gradeDiv);

  return miscInfoDiv;
}

let brushSvg: SVGElement | undefined;
function renderBrush(): SVGElement {
  if (!brushSvg) {
    brushSvg = document.createElementNS(SVG_NS, 'svg');
    brushSvg.classList.add('svgicon');
    brushSvg.style.opacity = '0.5';
    brushSvg.setAttribute('viewBox', '0 0 90 90');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      'M80 11c-2-2-5-2-7 0L22 58l12 12 46-52c2-2 2-5 0-7zM11 82c11 0 17-3 20-11L21 61c-12 6-3 14-10 21z'
    );
    brushSvg.append(path);
  }

  return brushSvg;
}

function renderFrequency(frequency: number | undefined): SVGElement {
  const freqSvg = document.createElementNS(SVG_NS, 'svg');
  freqSvg.classList.add('svgicon');
  freqSvg.setAttribute('viewBox', '0 0 8 8');

  const rect1 = document.createElementNS(SVG_NS, 'rect');
  rect1.setAttribute('x', '0');
  rect1.setAttribute('y', '5');
  rect1.setAttribute('width', '2');
  rect1.setAttribute('height', '3');
  rect1.setAttribute('rx', '0.5');
  rect1.setAttribute('ry', '0.5');
  if (!frequency) {
    rect1.setAttribute('opacity', '0.5');
  }
  freqSvg.append(rect1);

  const rect2 = document.createElementNS(SVG_NS, 'rect');
  rect2.setAttribute('x', '3');
  rect2.setAttribute('y', '3');
  rect2.setAttribute('width', '2');
  rect2.setAttribute('height', '5');
  rect2.setAttribute('rx', '0.5');
  rect2.setAttribute('ry', '0.5');
  if (!frequency || frequency >= (2500 * 2) / 3) {
    rect2.setAttribute('opacity', '0.5');
  }
  freqSvg.append(rect2);

  const rect3 = document.createElementNS(SVG_NS, 'rect');
  rect3.setAttribute('x', '6');
  rect3.setAttribute('width', '2');
  rect3.setAttribute('height', '8');
  rect3.setAttribute('rx', '0.5');
  rect3.setAttribute('ry', '0.5');
  if (!frequency || frequency >= 2500 / 3) {
    rect3.setAttribute('opacity', '0.5');
  }
  freqSvg.append(rect3);

  return freqSvg;
}

let userSvg: SVGElement | undefined;
function renderUser(): SVGElement {
  if (!userSvg) {
    userSvg = document.createElementNS(SVG_NS, 'svg');
    userSvg.classList.add('svgicon');
    userSvg.style.opacity = '0.5';
    userSvg.setAttribute('viewBox', '0 0 8 8');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      'M4 8C1.93 8 .25 7.73.25 7.25V7c0-.9.69-1.39 1.02-1.55.33-.16 1.04-.38 1.34-.57L3 4.62s0-.04 0 0v-.37a2.62 2.62 0 0 1-.44-1.05c-.15.05-.33-.14-.4-.42-.07-.27-.01-.52.13-.56h.02l-.06-.82c0-.21-.03-.39.23-.76.27-.36.5-.22.5-.22s.17-.18.32-.26c.16-.08.54-.28 1.24-.07.69.2.96.3 1.13 1.1.1.46.07.8.04 1.03h.02c.14.03.2.29.12.56-.07.27-.24.46-.38.43-.1.44-.24.75-.47 1.04v.37c0-.01 0 0 0 0s.08.07.37.26c.3.2 1.02.41 1.35.57.32.16 1 .69 1.03 1.55v.25C7.75 7.73 6.07 8 4 8z'
    );
    userSvg.append(path);
  }

  return userSvg;
}

function renderReferences(
  entry: KanjiResult,
  options: PopupOptions
): HTMLElement {
  const referenceTable = document.createElement('div');
  referenceTable.classList.add('references');
  referenceTable.lang = getLangTag();

  const referenceNames = getSelectedReferenceLabels(options.kanjiReferences);
  let numReferences = 0;
  for (const ref of referenceNames) {
    // Don't show the Nelson radical if it's the same as the regular radical
    // (in which case it will be empty) and we're showing the regular radical.
    if (
      ref.ref === 'nelson_r' &&
      !entry.rad.nelson &&
      options.kanjiReferences.includes('radical')
    ) {
      continue;
    }

    const referenceCell = document.createElement('div');
    referenceCell.classList.add('ref');
    referenceTable.append(referenceCell);

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('name');
    nameSpan.append(ref.short || ref.full);
    referenceCell.append(nameSpan);

    const value = getReferenceValue(entry, ref.ref) || '-';
    const valueSpan = document.createElement('span');
    valueSpan.classList.add('value');
    if (ref.ref === 'radical' || ref.ref === 'nelson_r') {
      valueSpan.lang = 'ja';
    }
    valueSpan.append(value);
    referenceCell.append(valueSpan);
    numReferences++;
  }

  // The layout we want is something in-between what CSS grid and CSS multicol
  // can do. See:
  //
  //   https://twitter.com/brianskold/status/1186198347184398336
  //
  // In the stylesheet we make let the table flow horizontally, but then here
  // where we know the number of rows, we update it to produce the desired
  // vertical flow.
  if (numReferences > 1) {
    referenceTable.style.gridAutoFlow = 'column';
    referenceTable.style.gridTemplateRows = `repeat(${Math.ceil(
      numReferences / 2
    )}, minmax(min-content, max-content))`;
  }

  // Now we go through and toggle the styles to get the desired alternating
  // effect.
  //
  // We can't easily use nth-child voodoo here because we need to
  // handle unbalanced columns etc. We also can't easily do this in the loop
  // where we generate the cells because we don't know how many references we
  // will generate at that point.
  for (const [index, cell] of [...referenceTable.children].entries()) {
    const row = index % Math.ceil(numReferences / 2);
    if (row % 2 === 0) {
      cell.classList.add('-highlight');
    }
  }

  return referenceTable;
}

function renderCopyDetails(
  copyNextKey: string,
  copyState?: CopyState,
  copyType?: CopyType,
  options: { kanji: boolean } = { kanji: false }
): HTMLElement | null {
  if (typeof copyState === 'undefined' || copyState === CopyState.Inactive) {
    return null;
  }

  const copyDiv = document.createElement('div');
  copyDiv.classList.add('copy');
  copyDiv.lang = browser.i18n.getMessage('lang_tag');

  const keysDiv = document.createElement('div');
  keysDiv.classList.add('keys');
  copyDiv.append(keysDiv);

  keysDiv.append(browser.i18n.getMessage('content_copy_keys_label') + ' ');

  const copyKeys: Array<{ key: string; l10nKey: string }> = CopyKeys.map(
    ({ key, type, popupString }) => {
      if (type === CopyType.Word && options.kanji) {
        return { key, l10nKey: CopyKanjiKeyStrings.popupString };
      } else {
        return { key, l10nKey: popupString };
      }
    }
  );
  copyKeys.push({
    key: copyNextKey,
    l10nKey: CopyNextKeyStrings.popupString,
  });

  for (const copyKey of copyKeys) {
    const keyElem = document.createElement('kbd');
    keyElem.append(copyKey.key);
    keysDiv.append(keyElem, ' = ' + browser.i18n.getMessage(copyKey.l10nKey));
    if (copyKey.key !== copyNextKey) {
      keysDiv.append(', ');
    }
  }

  if (copyState === CopyState.Finished && typeof copyType !== 'undefined') {
    copyDiv.classList.add('-finished');
    copyDiv.append(renderCopyStatus(getCopiedString(copyType)));
  } else if (copyState === CopyState.Error) {
    copyDiv.classList.add('-error');
    copyDiv.append(
      renderCopyStatus(browser.i18n.getMessage('content_copy_error'))
    );
  }

  return copyDiv;
}

function getCopiedString(target: CopyType): string {
  switch (target) {
    case CopyType.Entry:
      return browser.i18n.getMessage('content_copied_entry');

    case CopyType.TabDelimited:
      return browser.i18n.getMessage('content_copied_fields');

    case CopyType.Word:
      return browser.i18n.getMessage('content_copied_word');
  }
}

function renderCopyStatus(message: string): HTMLElement {
  const status = document.createElement('div');
  status.classList.add('status');
  status.innerText = message;
  return status;
}

// Cache language tag since we fetch it a lot
let langTag: string | null = null;
function getLangTag() {
  if (langTag === null) {
    langTag = browser.i18n.getMessage('lang_tag');
  }
  return langTag;
}
