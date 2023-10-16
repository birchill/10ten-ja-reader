import { DataSeries } from '@birchill/jpdict-idb';

export const localizedDataSeriesKey: { [series in DataSeries]: string } = {
  kanji: 'options_kanji_data_name',
  radicals: 'options_bushu_data_name',
  names: 'options_name_data_name',
  words: 'options_words_data_name',
};
