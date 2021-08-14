// Various common definitions used for the keys supported in copy mode.

export type CopyType = 'entry' | 'tab' | 'word';

interface CopyKey {
  type: CopyType;
  key: string;
  optionsString: string;
  popupString: string;
}

export const CopyKeys: Array<CopyKey> = [
  {
    type: 'entry',
    key: 'e',
    optionsString: 'options_popup_copy_entry',
    popupString: 'content_copy_keys_entry_label',
  },
  {
    type: 'tab',
    key: 't',
    optionsString: 'options_popup_copy_fields',
    popupString: 'content_copy_keys_fields_label',
  },
  {
    type: 'word',
    key: 'w',
    optionsString: 'options_popup_copy_word_kanji',
    popupString: 'content_copy_keys_word_label',
  },
];

export const CopyKanjiKeyStrings: Pick<CopyKey, 'popupString'> = {
  popupString: 'content_copy_keys_kanji_label',
};

export const CopyNextKeyStrings: Pick<
  CopyKey,
  'optionsString' | 'popupString'
> = {
  optionsString: 'options_popup_copy_next',
  popupString: 'content_copy_keys_next_label',
};
