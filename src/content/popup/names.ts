import { NameTranslation } from '@birchill/hikibiki-data';
import { browser } from 'webextension-polyfill-ts';

import { NameResult } from '../../background/search-result';
import { getDob } from '../../utils/age';
import { html } from './builder';

import { getLangTag } from './lang-tag';

export function renderName(entry: NameResult): HTMLElement {
  const entryDiv = html('div', { class: 'entry' });

  const entryTitleDiv = html('div', { class: 'w-title', lang: 'ja' });
  entryDiv.append(entryTitleDiv);

  if (entry.k) {
    const MAX_KANJI = 15;
    const trimKanji = entry.k.length > MAX_KANJI;
    const kanjiToDisplay = trimKanji ? entry.k.slice(0, MAX_KANJI) : entry.k;
    let kanji = kanjiToDisplay.join('、');
    if (trimKanji) {
      kanji += '…';
    }

    entryTitleDiv.append(html('span', { class: 'w-kanji' }, kanji));
  }

  const kana = entry.r.join('、');
  entryTitleDiv.append(html('span', { class: 'w-kana' }, kana));

  const definitionBlock = html('div', { class: 'w-def' });
  for (const tr of entry.tr) {
    definitionBlock.append(renderNameTranslation(tr));
  }
  entryDiv.append(definitionBlock);

  return entryDiv;
}

function renderNameTranslation(tr: NameTranslation): HTMLSpanElement {
  const definitionSpan = html('div', {
    // ENAMDICT only has English glosses
    lang: 'en',
  });

  // Only add age annotations if the name is for a person
  const annotateDetailFn = tr.type?.includes('person')
    ? annotateAge
    : (det: string) => det;
  definitionSpan.append(tr.det.map(annotateDetailFn).join(', '));

  for (const tag of tr.type || []) {
    const tagText = browser.i18n.getMessage(`content_names_tag_${tag}`);
    if (!tagText) {
      continue;
    }

    definitionSpan.append(
      html(
        'span',
        {
          class: `tag tag-${tag}`,
          lang: getLangTag(),
        },
        tagText
      )
    );
  }

  return definitionSpan;
}

function annotateAge(text: string): string {
  const dob = getDob(text);
  if (!dob) {
    return text;
  }

  // Calculate age
  const { date, approx } = dob;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const month = today.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < date.getDate())) {
    age--;
  }

  // Sanity check
  if (age < 1 || age > 150) {
    return text;
  }

  const ageString = approx
    ? browser.i18n.getMessage('content_names_age_approx', [String(age)])
    : browser.i18n.getMessage('content_names_age', [String(age)]);

  return `${text} (${ageString})`;
}
