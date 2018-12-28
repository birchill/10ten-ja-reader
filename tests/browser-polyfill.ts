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
    getMessage: (id: string) => {
      switch (id) {
        case 'content_names_dictionary':
          return 'Names Dictionary';
        case 'content_kanji_radical_label':
          return 'radical';
        case 'content_kanji_grade_label':
          return 'grade';
        case 'content_kanji_grade_general_use':
          return 'general use';
        case 'content_kanji_grade_name_use':
          return 'name use';
        case 'content_kanji_frequency_label':
          return 'freq';
        case 'content_kanji_strokes_label':
          return 'strokes';
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
