import { KanjiComponents, type Props } from './KanjiComponents';

export default {
  default: (
    <div
      style={{
        background: 'var(--bg-color)',
        color: 'var(--text-color)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
      }}
    >
      <TestCase
        title="With base radical"
        comp={[
          {
            c: '⿂',
            k: '魚',
            na: ['うおへん'],
            m: ['fish'],
            m_lang: 'en',
            base: { c: '⿂', k: '魚', na: ['うお'], m: ['fish'], m_lang: 'en' },
            is_rad: true,
          },
          {
            c: '⾭',
            k: '靑',
            na: ['あお'],
            m: ['blue', 'green'],
            m_lang: 'en',
          },
        ]}
      />
      <TestCase
        title="With sub-components with base radical"
        comp={[
          {
            c: '壮',
            na: ['さかん'],
            m: ['robust', 'manhood', 'prosperity'],
            m_lang: 'en',
            sub: [
              {
                c: '⺦',
                na: ['しょうへん'],
                base: {
                  c: '⽙',
                  k: '爿',
                  na: ['しょうへん'],
                  m: ['split wood'],
                  m_lang: 'en',
                },
                k: '爿',
                m: ['split wood'],
                m_lang: 'en',
              },
              {
                c: '⼠',
                na: ['さむらい'],
                k: '士',
                m: ['gentleman', 'scholar', 'samurai'],
                m_lang: 'en',
              },
            ],
          },
          {
            c: '⾐',
            na: ['ころも'],
            k: '衣',
            m: ['garment', 'clothes', 'dressing'],
            m_lang: 'en',
            is_rad: true,
          },
        ]}
      />
      <TestCase
        title="With radical in sub-components"
        comp={[
          {
            c: '下',
            na: [
              'した',
              'しも',
              'もと',
              'さげる',
              'さがる',
              'くだる',
              'くだり',
              'くだす',
              '-くだす',
              'くださる',
              'おろす',
              'おりる',
            ],
            m: ['below', 'down', 'descend', 'give', 'low', 'inferior'],
            m_lang: 'en',
            sub: [
              {
                c: '⼀',
                na: ['いち'],
                k: '一',
                m: ['one'],
                m_lang: 'en',
                is_rad: true,
              },
              {
                c: '⼘',
                na: ['ぼくのと', 'ぼく', 'うらない'],
                k: '卜',
                m: ['divining', 'fortune-telling'],
                m_lang: 'en',
              },
            ],
          },
          { c: '㇉', na: [], m: [], m_lang: '' },
        ]}
      />
    </div>
  ),
};

function TestCase({ title, ...props }: { title: string } & Props) {
  return (
    <div>
      <h2>{title}</h2>
      <KanjiComponents {...props} />
    </div>
  );
}
