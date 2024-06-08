const proverbTag = 'proverb';

const verbTags = [
  'v1', // Ichidan verb
  'v1-s', // Ichidan verb - kureru special class
  'v2a-s', // Nidan verb with 'u' ending (archaic)
  'v4h', // Yodan verb with `hu/fu' ending (archaic)
  'v4r', // Yodan verb with `ru' ending (archaic)
  'v5aru', // Godan verb - -aru special class
  'v5b', // Godan verb with `bu' ending
  'v5g', // Godan verb with `gu' ending
  'v5k', // Godan verb with `ku' ending
  'v5k-s', // Godan verb - Iku/Yuku special class
  'v5m', // Godan verb with `mu' ending
  'v5n', // Godan verb with `nu' ending
  'v5r', // Godan verb with `ru' ending
  'v5r-i', // Godan verb with `ru' ending (irregular verb)
  'v5s', // Godan verb with `su' ending
  'v5t', // Godan verb with `tsu' ending
  'v5u', // Godan verb with `u' ending
  'v5u-s', // Godan verb with `u' ending (special class)
  'v5uru', // Godan verb - Uru old class verb (old form of Eru)
  'vz', // Ichidan verb - zuru verb (alternative form of -jiru verbs)
  'vi', // intransitive verb
  'vk', // Kuru verb - special class
  'vn', // irregular nu verb
  'vr', // irregular ru verb, plain form ends with -ri
  'vs', // noun or participle which takes the aux. verb suru
  'vs-c', // su verb - precursor to the modern suru
  'vs-s', // suru verb - special class
  'vs-i', // suru verb - irregular
  'vt', // transitive verb
  'v-unspec', // verb unspecified
  'v4k', // Yodan verb with `ku' ending (archaic)
  'v4g', // Yodan verb with `gu' ending (archaic)
  'v4s', // Yodan verb with `su' ending (archaic)
  'v4t', // Yodan verb with `tsu' ending (archaic)
  'v4n', // Yodan verb with `nu' ending (archaic)
  'v4b', // Yodan verb with `bu' ending (archaic)
  'v4m', // Yodan verb with `mu' ending (archaic)
  'v2k-k', // Nidan verb (upper class) with `ku' ending (archaic)
  'v2g-k', // Nidan verb (upper class) with `gu' ending (archaic)
  'v2t-k', // Nidan verb (upper class) with `tsu' ending (archaic)
  'v2d-k', // Nidan verb (upper class) with `dzu' ending (archaic)
  'v2h-k', // Nidan verb (upper class) with `hu/fu' ending (archaic)
  'v2b-k', // Nidan verb (upper class) with `bu' ending (archaic)
  'v2m-k', // Nidan verb (upper class) with `mu' ending (archaic)
  'v2y-k', // Nidan verb (upper class) with `yu' ending (archaic)
  'v2r-k', // Nidan verb (upper class) with `ru' ending (archaic)
  'v2k-s', // Nidan verb (lower class) with `ku' ending (archaic)
  'v2g-s', // Nidan verb (lower class) with `gu' ending (archaic)
  'v2s-s', // Nidan verb (lower class) with `su' ending (archaic)
  'v2z-s', // Nidan verb (lower class) with `zu' ending (archaic)
  'v2t-s', // Nidan verb (lower class) with `tsu' ending (archaic)
  'v2d-s', // Nidan verb (lower class) with `dzu' ending (archaic)
  'v2n-s', // Nidan verb (lower class) with `nu' ending (archaic)
  'v2h-s', // Nidan verb (lower class) with `hu/fu' ending (archaic)
  'v2b-s', // Nidan verb (lower class) with `bu' ending (archaic)
  'v2m-s', // Nidan verb (lower class) with `mu' ending (archaic)
  'v2y-s', // Nidan verb (lower class) with `yu' ending (archaic)
  'v2r-s', // Nidan verb (lower class) with `ru' ending (archaic)
  'v2w-s', // Nidan verb (lower class) with `u' ending and `we' conjugation (archaic)
];

function getFilteredTags(
  pos: string[] | undefined,
  misc: string[] | undefined
) {
  if (pos === undefined) {
    return [];
  }
  if (misc === undefined) {
    return pos;
  }

  if (misc.includes(proverbTag)) {
    return pos.filter((tag) => !verbTags.includes(tag));
  }

  return pos;
}

export { getFilteredTags };
