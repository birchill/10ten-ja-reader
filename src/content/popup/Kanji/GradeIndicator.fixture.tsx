import { GradeIndicator } from './GradeIndicator';

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
      <div>
        <h2>3</h2>
        <GradeIndicator gr={3} />
      </div>
      <div>
        <h2>8</h2>
        <GradeIndicator gr={8} />
      </div>
      <div>
        <h2>9</h2>
        <GradeIndicator gr={9} />
      </div>
      <div>
        <h2>
          <code>undefined</code>
        </h2>
        <GradeIndicator />
      </div>
    </div>
  ),
};
