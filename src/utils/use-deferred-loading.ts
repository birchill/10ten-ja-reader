import { useEffect, useState } from 'preact/hooks';

export const LOADING_DEFER_MS = 250;

export type TtsButtonState = 'idle' | 'loading' | 'playing' | 'error';

/**
 * Returns idle until loading lasts 250ms, avoiding flashes during short waits.
 * Other states pass through immediately and reset the delay.
 */
export function useDeferredLoading(kind: TtsButtonState): TtsButtonState {
  const [showLoading, setShowLoading] = useState(false);
  const isLoading = kind === 'loading';

  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return undefined;
    }

    const timer = setTimeout(() => setShowLoading(true), LOADING_DEFER_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading) {
    return showLoading ? 'loading' : 'idle';
  }

  return kind;
}
