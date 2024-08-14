import { StrokeCount } from './StrokeCount';

export default {
  default: (
    <div
      class="kanji-table"
      style={{
        background: 'var(--bg-color)',
        color: 'var(--text-color)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
      }}
    >
      <div class="misc">
        <h2>Singular</h2>
        <StrokeCount sc={1} />
      </div>
      <div class="misc">
        <h2>Plural</h2>
        <StrokeCount sc={17} />
      </div>
    </div>
  ),
};
