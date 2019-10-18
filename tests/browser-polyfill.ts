export const browser = {
  runtime: {
    sendMessage: () => new Promise(resolve => resolve),
    onMessage: {
      addListener: () => {
        // Probably should do something with this...
      },
    },
  },
  i18n: {
    getMessage: (id: string, replacements?: Array<string>) => {
      switch (id) {
        case 'content_names_dictionary':
          return 'Names Dictionary';
        case 'content_names_tag_surname':
          return 'surname';
        case 'content_names_tag_place':
          return 'place';
        case 'content_names_tag_person':
          return 'person';
        case 'content_names_tag_given':
          return 'given';
        case 'content_names_tag_female':
          return 'female';
        case 'content_names_tag_male':
          return 'male';
        case 'content_names_tag_full':
          return 'full name';
        case 'content_names_tag_product':
          return 'product';
        case 'content_names_tag_company':
          return 'company';
        case 'content_names_tag_org':
          return 'org';
        case 'content_names_tag_station':
          return 'station';
        case 'content_names_tag_work':
          return 'work';
        case 'content_kanji_radical_label':
          return 'radical';
        case 'content_kanji_base_radical':
          return `from ${replacements ? replacements[0] : '?'} (${
            replacements ? replacements[1] : '?'
          })`;
        case 'content_kanji_grade_label':
          return `Grade ${replacements ? replacements[0] : '?'}`;
        case 'content_kanji_grade_general_use':
          return 'General use';
        case 'content_kanji_grade_name_use':
          return 'Name use';
        case 'content_kanji_frequency_label':
          return 'Freq. ';
        case 'content_kanji_strokes_label':
          return `${replacements ? replacements[0] : '?'} strokes`;
        case 'content_kanji_strokes_label':
          return '1 stroke';
        case 'content_kanji_kentei_label':
          return 'Kanji Kentei Level';
        case 'content_kanji_kentei_level':
          return '10';
        case 'content_kanji_kentei_level_pre':
          return 'Pre-2';
        case 'content_copy_keys_label':
          return 'Copy:';
        case 'content_copy_keys_entry_label':
          return 'entry';
        case 'content_copy_keys_fields_label':
          return 'tab-separated';
        case 'content_copy_keys_word_label':
          return 'word';
        case 'content_copy_keys_kanji_label':
          return 'kanji';
        case 'content_copy_keys_next_label':
          return 'next';
        default:
          return 'Unrecognized string ID';
      }
    },
  },
};

declare global {
  interface Window {
    browser: any;
  }
}

window.browser = browser;
