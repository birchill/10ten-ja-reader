import { KanjiReadings } from './KanjiReadings';

export default {
  default: (
    <KanjiReadings r={{ on: ['シ'], kun: ['さむらい'], na: ['お', 'ま'] }} />
  ),
  wide: (
    <KanjiReadings
      r={{
        py: ['he2', 'he4', 'huo2', 'huo4', 'huo5', 'hai1', 'he5'],
        on: ['ワ', 'オ', 'カ'],
        kun: ['やわ.らぐ', 'やわ.らげる', 'なご.む', 'なご.やか', 'あ.える'],
        na: [
          'あい',
          'いず',
          'かず',
          'かつ',
          'かつり',
          'かづ',
          'たけ',
          'ち',
          'とも',
          'な',
          'にぎ',
          'まさ',
          'やす',
          'よし',
          'より',
          'わだこ',
          'わっ',
        ],
      }}
    />
  ),
  'on only': <KanjiReadings r={{ on: ['レキ', 'レッキ'] }} />,
  'kun only': <KanjiReadings r={{ kun: ['とうげ'] }} />,
};
