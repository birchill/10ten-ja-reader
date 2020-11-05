// TODO: Drop the parts of this we don't actually need, and for the rest,
// try to re-use definitions from hikibiki-data once we update it.

// This is our slightly slimmed down version of the `WordResult` produced by
// hikibiki-data, augmented with reason and romaji fields.
//
// It represents the subset of fields we use and, most importantly, the
// subset of fields we make available when reading from the flat file (fallback)
// copy of the data.

export interface WordResult {
  k: Array<ExtendedKanjiEntry>;
  r: Array<ExtendedKanaEntry>;
  s: Array<ExtendedSense>;
  reason?: string;
  romaji?: Array<string>;
}

// The main difference between these entries and those defined by hikibiki-data
// is that we drop the fields that report which range of a headword or gloss
// matched since we never do substring matching.
export type ExtendedKanjiEntry = {
  ent: string;
  match: boolean;
} & KanjiMeta;

export type ExtendedKanaEntry = {
  ent: string;
  match: boolean;
} & ReadingMeta;

export type ExtendedSense = { match: boolean; g: Array<Gloss> } & Omit<
  WordSense,
  'g' | 'gt' | 'xref' | 'ant'
>;

export interface Gloss {
  str: string;
  type?: GlossType; // undefined = GlossType.None
}

// TODO: The following definitions are all identical to hikibiki-data's
// definitions so we should use those once we update hikibiki-data.

export const enum GlossType {
  None,
  Expl,
  Lit,
  Fig,
}
const GLOSS_TYPE_MAX: number = GlossType.Fig;
export const BITS_PER_GLOSS_TYPE = Math.floor(Math.log2(GLOSS_TYPE_MAX)) + 1;

export interface KanjiMeta {
  i?: Array<KanjiInfo>;
  p?: Array<string>;
}

export type KanjiInfo = 'ateji' | 'io' | 'iK' | 'ik' | 'oK';

export interface ReadingMeta {
  i?: Array<ReadingInfo>;
  p?: Array<string>;
  app?: number;
  a?: number | Array<Accent>;
}

export type ReadingInfo = 'gikun' | 'ik' | 'ok' | 'uK';

export interface Accent {
  i: number;
  pos?: Array<PartOfSpeech>;
}

export interface WordSense {
  g: Array<string>;
  gt?: number;
  lang?: string;

  kapp?: number;
  rapp?: number;

  pos?: Array<PartOfSpeech>;
  field?: Array<FieldType>;
  misc?: Array<MiscType>;
  dial?: Array<Dialect>;
  inf?: string;

  lsrc?: Array<LangSource>;
}

// prettier-ignore
export type PartOfSpeech =
  | 'adj-f' | 'adj-i' | 'adj-ix' | 'adj-kari' | 'adj-ku' | 'adj-na' | 'adj-nari'
  | 'adj-no' | 'adj-pn' | 'adj-shiku' | 'adj-t' | 'adv' | 'adv-to' | 'aux'
  | 'aux-adj' | 'aux-v' | 'conj' | 'cop' | 'ctr' | 'exp' | 'int' | 'n' | 'n-adv'
  | 'n-pr' | 'n-pref' | 'n-suf' | 'n-t' | 'num' | 'pn' | 'pref' | 'prt' | 'suf'
  | 'unc' | 'v-unspec' | 'v1' | 'v1-s' | 'v2a-s' | 'v2b-k' | 'v2b-s' | 'v2d-k'
  | 'v2d-s' | 'v2g-k' | 'v2g-s' | 'v2h-k' | 'v2h-s' | 'v2k-k' | 'v2k-s'
  | 'v2m-k' | 'v2m-s' | 'v2n-s' | 'v2r-k' | 'v2r-s' | 'v2s-s' | 'v2t-k'
  | 'v2t-s' | 'v2w-s' | 'v2y-k' | 'v2y-s' | 'v2z-s' | 'v4b' | 'v4g' | 'v4h'
  | 'v4k' | 'v4m' | 'v4n' | 'v4r' | 'v4s' | 'v4t' | 'v5aru' | 'v5b' | 'v5g'
  | 'v5k' | 'v5k-s' | 'v5m' | 'v5n' | 'v5r' | 'v5r-i' | 'v5s' | 'v5t' | 'v5u'
  | 'v5u-s' | 'v5uru' | 'vi' | 'vk' | 'vn' | 'vr' | 'vs' | 'vs-c' | 'vs-i'
  | 'vs-s' | 'vt' | 'vz';

// prettier-ignore
export type FieldType =
  | 'agric' | 'anat' | 'archeol' | 'archit' | 'art' | 'astron' | 'audvid'
  | 'aviat' | 'baseb' | 'biochem' | 'biol' | 'bot' | 'Buddh' | 'bus' | 'chem'
  | 'Christn' | 'comp' | 'cryst' | 'ecol' | 'econ' | 'elec' | 'electr'
  | 'embryo' | 'engr' | 'ent' | 'finc' | 'fish' | 'food' | 'gardn' | 'genet'
  | 'geogr' | 'geol' | 'geom' | 'go' | 'golf' | 'gramm' | 'grmyth' | 'hanaf'
  | 'horse' | 'law' | 'ling' | 'logic' | 'MA' | 'mahj' | 'math' | 'mech'
  | 'med' | 'met' | 'mil' | 'music' | 'ornith' | 'paleo' | 'pathol' | 'pharm'
  | 'phil' | 'photo' | 'physics' | 'physiol' | 'print' | 'psych' | 'Shinto'
  | 'shogi' | 'sports' | 'stat' | 'sumo' | 'telec' | 'tradem' | 'vidg' | 'zool';

// prettier-ignore
export type MiscType =
  | 'abbr' | 'arch' | 'chn' | 'col' | 'company' | 'dated' | 'derog' | 'fam'
  | 'fem' | 'given' | 'hist' | 'hon' | 'hum' | 'id' | 'joc' | 'litf' | 'm-sl'
  | 'male' | 'net-sl' | 'obs' | 'obsc' | 'on-mim' | 'organization' | 'person'
  | 'place' | 'poet' | 'pol' | 'product' | 'proverb' | 'quote' | 'rare' | 'sens'
  | 'sl' | 'station' | 'surname' | 'uk' | 'unclass' | 'vulg' | 'work' | 'X'
  | 'yoji';

export type Dialect =
  | 'ho' // Hokkaido
  | 'tsug' // Tsugaru
  | 'th' // Tohoku
  | 'na' // Nagano
  | 'kt' // Kanto
  | 'ks' // Kansai
  | 'ky' // Kyoto
  | 'os' // Osaka
  | 'ts' // Tosa
  | '9s' // Kyushu
  | 'ok'; // Ryuukyuu

export interface LangSource {
  lang?: string;
  src?: string;
  part?: true;
  wasei?: true;
}
