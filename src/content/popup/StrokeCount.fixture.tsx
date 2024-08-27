import { useState } from 'preact/hooks';

import { StrokeCount } from './StrokeCount';

export default {
  default: () => {
    const [paused, setPaused] = useState(true);
    const togglePaused = () => setPaused((prev) => !prev);

    return (
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
          <h2>Singular</h2>
          <StrokeCount sc={1} />
        </div>
        <div>
          <h2>Plural</h2>
          <StrokeCount sc={17} />
        </div>
        <div>
          <h2>With animation</h2>
          <StrokeCount
            sc={11}
            onToggleAnimation={togglePaused}
            isPlayingAnimation={!paused}
          />
        </div>
      </div>
    );
  },
};
