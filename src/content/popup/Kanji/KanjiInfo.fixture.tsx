import { KanjiInfo } from './KanjiInfo';

export default {
  default: (
    <KanjiInfo
      r={{ on: ['シ'], kun: ['さむらい'], na: ['お', 'ま'] }}
      m={['gentleman', 'scholar', 'samurai', 'samurai radical (no. 33)']}
      rad={{
        x: 33,
        b: '⼠',
        k: '士',
        na: ['さむらい'],
        m: ['gentleman', 'scholar', 'samurai'],
        m_lang: 'en',
      }}
      misc={{ sc: 3, gr: 4, freq: 526, jlpt: 1, kk: 7 }}
      m_lang="en"
      comp={[]}
    />
  ),
  wide: (
    <KanjiInfo
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
      m={['harmony', 'Japanese style', 'peace', 'soften', 'Japan']}
      rad={{
        x: 30,
        b: '⼝',
        k: '口',
        na: ['くち'],
        m: ['mouth'],
        m_lang: 'en',
        nelson: 115,
      }}
      misc={{ sc: 8, gr: 3, freq: 124, jlpt: 2, kk: 8 }}
      comp={[
        { c: '⼝', na: ['くち'], m: ['mouth'], m_lang: 'en' },
        {
          c: '⽲',
          na: ['のぎ'],
          m: ['two branch tree', 'grain'],
          m_lang: 'en',
        },
      ]}
      m_lang="en"
      showComponents
    />
  ),
  'meta tags': (
    <KanjiInfo
      r={{ kun: ['もみ'], on: ['ジョウ'] }}
      m={['toad', 'mantis']}
      rad={{
        x: 142,
        b: '⾍',
        k: '虫',
        na: ['むし'],
        m: ['insect', 'bug', 'temper'],
        m_lang: 'en',
      }}
      misc={{ sc: 17, meta: ['phantom kanji', 'kokuji'] }}
      comp={[
        {
          c: '⼍',
          na: ['わかんむり'],
          m: ['crown shaped wa'],
          m_lang: 'en',
          k: '冖',
        },
        { c: '⼝', na: ['くち'], m: ['mouth'], m_lang: 'en', k: '口' },
        {
          c: '⼱',
          na: ['はば'],
          m: ['towel', 'hanging scroll', 'width'],
          m_lang: 'en',
          k: '巾',
        },
        {
          c: '⾍',
          na: ['むし'],
          m: ['insect', 'bug', 'temper'],
          m_lang: 'en',
          k: '虫',
        },
        {
          c: '⺌',
          na: ['しょうがしら', 'しょうかんむり', 'しょう', 'なおがしら'],
          m: ['little', 'small'],
          m_lang: 'en',
          k: '小',
        },
      ]}
      m_lang="en"
      showComponents
    />
  ),
};
