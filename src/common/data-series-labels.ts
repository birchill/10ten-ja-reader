import { DataSeries } from '@birchill/jpdict-idb';
import browser from 'webextension-polyfill';

const labels: { [series in DataSeries]: string } = {
  kanji: 'options_kanji_data_name',
  radicals: 'options_bushu_data_name',
  names: 'options_name_data_name',
  words: 'options_words_data_name',
};

export function getLocalizedDataSeriesLabel(series: DataSeries): string {
  return browser.i18n.getMessage(labels[series]);
}
