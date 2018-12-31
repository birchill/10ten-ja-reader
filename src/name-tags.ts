export const enum NameTag {
  Surname,
  Place, // Place name
  Person, // Person name, either given or surname, as-yet unclassified
  Given, // Given name, as-yet not classified by sex
  Female, // Female given name
  Male, // Male given name
  Full, // Full (usually family plus given) name of a particular person
  Product, // Product name
  Company, // Company name
  Org, // Organization name
  Station, // Station name
  Work, // Work of literature, art, film, etc.
}

interface NameTagEntry {
  tag: NameTag;
  // The short (1~2 character) string used to represent the tag in the ENAMDICT
  dictKey: string;
  // The longer key used to represent the tag in i18n strings and CSS classes
  key: string;
}

const nameTags: Array<NameTagEntry> = [
  { tag: NameTag.Surname, dictKey: 's', key: 'surname' },
  { tag: NameTag.Place, dictKey: 'p', key: 'place' },
  { tag: NameTag.Person, dictKey: 'u', key: 'person' },
  { tag: NameTag.Given, dictKey: 'g', key: 'given' },
  { tag: NameTag.Female, dictKey: 'f', key: 'female' },
  { tag: NameTag.Male, dictKey: 'm', key: 'male' },
  { tag: NameTag.Full, dictKey: 'h', key: 'full' },
  { tag: NameTag.Product, dictKey: 'pr', key: 'product' },
  { tag: NameTag.Company, dictKey: 'c', key: 'company' },
  { tag: NameTag.Org, dictKey: 'o', key: 'org' },
  { tag: NameTag.Station, dictKey: 'st', key: 'station' },
  { tag: NameTag.Work, dictKey: 'wk', key: 'work' },
];

const tagMap = new Map<NameTag, NameTagEntry>(
  nameTags.map(entry => [entry.tag, entry] as [NameTag, NameTagEntry])
);

export function getKeyForTag(tag: NameTag): string {
  return tagMap.get(tag)!.key;
}

export function getDictKeyForTag(tag: NameTag): string {
  return tagMap.get(tag)!.dictKey;
}

const dictKeyToTagMap = new Map<string, NameTag>(
  nameTags.map(entry => [entry.dictKey, entry.tag] as [string, NameTag])
);

export function getTagForDictKey(dictKey: string): NameTag | undefined {
  return dictKeyToTagMap.get(dictKey);
}

// Serialize an array of NameTags using the corresponding dict keys
export function serializeTags(tags: Array<NameTag>): string {
  return tags.map(getDictKeyForTag).join(',');
}
