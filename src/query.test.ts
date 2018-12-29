import { NameTag } from './name-tags';
import { parseNameEntries } from './query';

describe('parseNameEntries', () => {
  it('parses name entries', async () => {
    // This is simply the entry that was a line 1000 when I wrote the test.
    // There's nothing particularly special about it.
    const searchResult: WordSearchResult = {
      data: [['いたち /(f) Itachi/', null]],
      names: true,
      more: false,
      matchLen: 3,
    };

    const result = parseNameEntries(searchResult);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      names: [{ kana: 'いたち' }],
      definition: { tags: [NameTag.Female], text: 'Itachi' },
    });
  });

  it('merges entries with the same definition', async () => {
    const searchResult: WordSearchResult = {
      data: [
        ['いぶ喜 [いぶき] /(f) Ibuki/', null],
        ['いぶ希 [いぶき] /(f) Ibuki/', null],
        ['いぶ記 [いぶき] /(f) Ibuki/', null],
      ],
      names: true,
      more: true,
      matchLen: 3,
    };

    const result = parseNameEntries(searchResult);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      names: [
        { kanji: 'いぶ喜', kana: 'いぶき' },
        { kanji: 'いぶ希', kana: 'いぶき' },
        { kanji: 'いぶ記', kana: 'いぶき' },
      ],
      definition: { tags: [NameTag.Female], text: 'Ibuki' },
    });
  });

  it('parses multiple entries', async () => {
    const searchResult: WordSearchResult = {
      data: [
        // These two have different definitions so they won't be merged
        ['阿我田 [あがた] /(s) Agata/', null],
        ['阿方 [あがた] /(p,s) Agata/', null],
      ],
      names: true,
      more: false,
      matchLen: 3,
    };

    const result = parseNameEntries(searchResult);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      names: [{ kanji: '阿我田', kana: 'あがた' }],
      definition: { tags: [NameTag.Surname], text: 'Agata' },
    });
    expect(result[1]).toMatchObject({
      names: [{ kanji: '阿方', kana: 'あがた' }],
      definition: { tags: [NameTag.Place, NameTag.Surname], text: 'Agata' },
    });
  });

  // We would include a separate test here that we can parse multiple tags in
  // a definition but the above test already covers that.

  it('parses all known tags', async () => {
    const searchResult: WordSearchResult = {
      data: [['てすと /(s,p,u,g,f,m,h,pr,c,o,st,wk) Test/', null]],
      names: true,
      more: false,
      matchLen: 3,
    };

    const result = parseNameEntries(searchResult);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      names: [{ kana: 'てすと' }],
      definition: {
        tags: [
          NameTag.Surname,
          NameTag.Place,
          NameTag.Person,
          NameTag.Given,
          NameTag.Female,
          NameTag.Male,
          NameTag.Full,
          NameTag.Product,
          NameTag.Company,
          NameTag.Org,
          NameTag.Station,
          NameTag.Work,
        ],
        text: 'Test',
      },
    });
  });

  it('handles an entry with an unrecognized tag', async () => {
    const searchResult: WordSearchResult = {
      data: [['てすと /(yer) Test/', null]],
      names: true,
      more: false,
      matchLen: 3,
    };

    const result = parseNameEntries(searchResult);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      names: [{ kana: 'てすと' }],
      definition: { tags: [], text: '(yer) Test' },
    });
  });

  it('handles an entry without any tags', async () => {
    const searchResult: WordSearchResult = {
      data: [['てすと /Test/', null]],
      names: true,
      more: false,
      matchLen: 3,
    };

    const result = parseNameEntries(searchResult);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      names: [{ kana: 'てすと' }],
      definition: { tags: [], text: 'Test' },
    });
  });

  it('reformats slashes', async () => {
    const searchResult: WordSearchResult = {
      data: [['シェフェール /(u) Schaeffer/Schefer/Scheffer/Schoffer/', null]],
      names: true,
      more: false,
      matchLen: 3,
    };

    const result = parseNameEntries(searchResult);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      names: [{ kana: 'シェフェール' }],
      definition: {
        tags: [NameTag.Person],
        text: 'Schaeffer; Schefer; Scheffer; Schoffer',
      },
    });
  });

  it('ignores other information in braces', async () => {
    const searchResult: WordSearchResult = {
      data: [
        [
          'シーボルト /(p,s) (ignore) Seabold/Siebold ((Philipp Franz Balthasar von) Siebold, scientific explorer of Japan)/',
          null,
        ],
      ],
      names: true,
      more: false,
      matchLen: 3,
    };

    const result = parseNameEntries(searchResult);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      names: [{ kana: 'シーボルト' }],
      definition: {
        tags: [NameTag.Place, NameTag.Surname],
        text:
          '(ignore) Seabold; Siebold ((Philipp Franz Balthasar von) Siebold, scientific explorer of Japan)',
      },
    });
  });
});
