export const browser = {
  runtime: {
    sendMessage: () => new Promise((resolve) => resolve),
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
        case 'content_names_tag_unclass':
          return 'person';
        case 'content_names_tag_given':
          return 'given';
        case 'content_names_tag_fem':
          return 'female';
        case 'content_names_tag_masc':
          return 'male';
        case 'content_names_tag_person':
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
        case 'content_names_tag_ok':
          return 'old';
        case 'content_kanji_radical_label':
          return 'radical';
        case 'content_kanji_base_radical':
          return `from ${replacements ? replacements[0] : '?'} (${
            replacements ? replacements[1] : '?'
          })`;
        case 'content_kanji_nanori_label':
          return 'Names (名乗り)';
        case 'content_kanji_grade_label':
          return `Grade ${replacements ? replacements[0] : '?'}`;
        case 'content_kanji_grade_general_use':
          return 'General use';
        case 'content_kanji_grade_name_use':
          return 'Name use';
        case 'content_kanji_frequency_label':
          return 'Freq. ';
        case 'content_kanji_meta_kokuji':
          return 'kokuji';
        case 'content_kanji_meta_phantom_kanji':
          return 'phantom kanji';
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
        case 'gloss_type_label_expl':
          return 'explanation';
        case 'field_label_mahj':
          return 'mahjong';
        case 'head_info_label_ateji':
          return 'ateji';
        case 'head_info_label_gikun':
          return 'gikun';
        case 'head_info_label_ikanji':
          return 'rare';
        case 'head_info_label_ikana':
          return 'rare';
        case 'head_info_label_io':
          return 'rare';
        case 'head_info_label_okanji':
          return 'old';
        case 'head_info_label_okana':
          return 'old';
        case 'head_info_label_ukanji':
          return 'usu. kanji';
        case 'ref_label_radical':
          return 'Radical';
        case 'ref_label_kk':
          return 'Kanji Kentei';
        case 'ref_label_jlpt':
          return 'JLPT';
        case 'ref_label_nelson_r':
          return 'Radical (Nelson)';
        case 'ref_label_unicode':
          return 'Unicode';
        case 'lang_tag':
          return 'en';
        case 'misc_label_abbr':
          return 'abbr.';
        case 'misc_label_arch':
          return 'archaism';
        case 'misc_label_hon':
          return 'honorific';
        case 'pos_label_adj_f':
          return 'pre-noun adj.';
        case 'pos_label_adj_i':
          return 'i adj.';
        case 'pos_label_adj_ix':
          return 'ii/yoi adj.';
        case 'pos_label_adj_kari':
          return 'kari adj.';
        case 'pos_label_adj_ku':
          return 'ku adj.';
        case 'pos_label_adj_na':
          return 'na adj.';
        case 'pos_label_adj_nari':
          return 'nari adj.';
        case 'pos_label_adj_no':
          return 'no-adj.';
        case 'pos_label_adj_pn':
          return 'pre-noun adj.';
        case 'pos_label_adj_shiku':
          return 'shiku adj.';
        case 'pos_label_adj_t':
          return 'taru adj.';
        case 'pos_label_adv':
          return 'adverb';
        case 'pos_label_adv_to':
          return 'adverb to';
        case 'pos_label_aux':
          return 'aux.';
        case 'pos_label_aux_adj':
          return 'aux. adj.';
        case 'pos_label_aux_v':
          return 'aux. verb';
        case 'pos_label_conj':
          return 'conj.';
        case 'pos_label_cop':
          return 'copula';
        case 'pos_label_ctr':
          return 'counter';
        case 'pos_label_exp':
          return 'exp.';
        case 'pos_label_int':
          return 'int.';
        case 'pos_label_n':
          return 'noun';
        case 'pos_label_n_adv':
          return 'adv. noun';
        case 'pos_label_n_pr':
          return 'proper noun';
        case 'pos_label_n_pref':
          return 'n-pref';
        case 'pos_label_n_suf':
          return 'n-suf';
        case 'pos_label_n_t':
          return 'n-temp';
        case 'pos_label_num':
          return 'numeric';
        case 'pos_label_pn':
          return 'pronoun';
        case 'pos_label_pref':
          return 'prefix';
        case 'pos_label_prt':
          return 'particle';
        case 'pos_label_suf':
          return 'suffix';
        case 'pos_label_unc':
          return '?';
        case 'pos_label_v_unspec':
          return 'verb';
        case 'pos_label_v1':
          return '-ru verb';
        case 'pos_label_v1_s':
          return '-ru verb*';
        case 'pos_label_v2a_s':
          return '-u nidan verb';
        case 'pos_label_v2b_k':
          return '-bu nidan verb (upper)';
        case 'pos_label_v2b_s':
          return '-bu nidan verb (lower)';
        case 'pos_label_v2d_k':
          return '-dzu nidan verb (upper)';
        case 'pos_label_v2d_s':
          return '-dzu nidan verb (lower)';
        case 'pos_label_v2g_k':
          return '-gu nidan verb (upper)';
        case 'pos_label_v2g_s':
          return '-gu nidan verb (lower)';
        case 'pos_label_v2h_k':
          return '-hu/fu nidan verb (upper)';
        case 'pos_label_v2h_s':
          return '-hu/fu nidan verb (lower)';
        case 'pos_label_v2k_k':
          return '-ku nidan verb (upper)';
        case 'pos_label_v2k_s':
          return '-ku nidan verb (lower)';
        case 'pos_label_v2m_k':
          return '-mu nidan verb (upper)';
        case 'pos_label_v2m_s':
          return '-mu nidan verb (lower)';
        case 'pos_label_v2n_s':
          return '-nu nidan verb';
        case 'pos_label_v2r_k':
          return '-ru nidan verb (upper)';
        case 'pos_label_v2r_s':
          return '-ru nidan verb (lower)';
        case 'pos_label_v2s_s':
          return '-su nidan verb';
        case 'pos_label_v2t_k':
          return '-tsu nidan verb (upper)';
        case 'pos_label_v2t_s':
          return '-tsu nidan verb (lower)';
        case 'pos_label_v2w_s':
          return '-u nidan verb + we';
        case 'pos_label_v2y_k':
          return '-yu nidan verb (upper)';
        case 'pos_label_v2y_s':
          return '-yu nidan verb (lower)';
        case 'pos_label_v2z_s':
          return '-zu nidan verb';
        case 'pos_label_v4b':
          return '-bu yodan verb';
        case 'pos_label_v4g':
          return '-gu yodan verb';
        case 'pos_label_v4h':
          return '-hu/fu yodan verb';
        case 'pos_label_v4k':
          return '-ku yodan verb';
        case 'pos_label_v4m':
          return '-mu yodan verb';
        case 'pos_label_v4n':
          return '-nu yodan verb';
        case 'pos_label_v4r':
          return '-ru yodan verb';
        case 'pos_label_v4s':
          return '-su yodan verb';
        case 'pos_label_v4t':
          return '-tsu yodan verb';
        case 'pos_label_v5aru':
          return '-aru godan verb';
        case 'pos_label_v5b':
          return '-bu verb';
        case 'pos_label_v5g':
          return '-gu verb';
        case 'pos_label_v5k':
          return '-ku verb';
        case 'pos_label_v5k_s':
          return 'iku/yuku verb';
        case 'pos_label_v5m':
          return '-mu verb';
        case 'pos_label_v5n':
          return '-nu verb';
        case 'pos_label_v5r':
          return '-u verb';
        case 'pos_label_v5r_i':
          return '-u verb*';
        case 'pos_label_v5s':
          return '-su verb';
        case 'pos_label_v5t':
          return '-tsu verb';
        case 'pos_label_v5u':
          return '-u verb';
        case 'pos_label_v5u_s':
          return '-u verb*';
        case 'pos_label_v5uru':
          return '-uru verb';
        case 'pos_label_vi':
          return 'intrans.';
        case 'pos_label_vk':
          return 'kuru verb';
        case 'pos_label_vn':
          return '-nu verb*';
        case 'pos_label_vr':
          return '-nu (-ri) verb*';
        case 'pos_label_vs':
          return '+suru';
        case 'pos_label_vs_c':
          return '-su(ru) verb';
        case 'pos_label_vs_i':
          return '-suru verb';
        case 'pos_label_vs_s':
          return '-suru verb*';
        case 'pos_label_vt':
          return 'trans.';
        case 'pos_label_vz':
          return 'zuru verb';
        default:
          console.error(`Unrecognized string ID: ${id}`);
          return '';
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
