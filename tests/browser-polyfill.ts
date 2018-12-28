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
