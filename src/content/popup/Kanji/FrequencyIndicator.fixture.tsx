import { FrequencyIndicator } from './FrequencyIndicator';

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
        <h2>0</h2>
        <FrequencyIndicator frequency={0} />
      </div>
      <div>
        <h2>10</h2>
        <FrequencyIndicator frequency={10} />
      </div>
      <div>
        <h2>1000</h2>
        <FrequencyIndicator frequency={1000} />
      </div>
      <div>
        <h2>2000</h2>
        <FrequencyIndicator frequency={2000} />
      </div>
    </div>
  ),
};
