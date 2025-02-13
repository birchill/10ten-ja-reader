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
        title="Regular radical"
        rad={{
          x: 195,
          b: '⿂',
          k: '魚',
          na: ['うお'],
          m: ['fish'],
          m_lang: 'en',
        }}
        comp={[
          { c: '⿂', na: ['うお'], m: ['fish'], m_lang: 'en' },
          { c: '⾭', na: ['あお'], m: ['blue', 'green'], m_lang: 'en' },
        ]}
      />
      <TestCase
        title="With base radical"
        rad={{
          x: 64,
          b: '⺘',
          k: '扌',
          na: ['てへん'],
          m: ['hand'],
          m_lang: 'en',
          base: { b: '⼿', k: '手', na: ['て'], m: ['hand'], m_lang: 'en' },
        }}
        comp={[
          {
            c: '⼇',
            na: ['なべぶた', 'けいさん', 'けいさんかんむり'],
            m: ['lid'],
            m_lang: 'en',
          },
          {
            c: '⼜',
            na: ['また'],
            m: ['or again', 'furthermore', 'on the other hand'],
            m_lang: 'en',
          },
          {
            c: '⼡',
            na: ['ふゆがしら', 'のまたかんむり', 'のまた', 'ちかんむり'],
            m: ['winter'],
            m_lang: 'en',
          },
          { c: '⺘', na: ['てへん'], m: ['hand'], m_lang: 'en' },
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
