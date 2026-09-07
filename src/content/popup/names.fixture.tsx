import { useLayoutEffect, useRef } from 'preact/hooks';

import type { TtsPlaybackHandle } from '../tts-playback-controller';

import { unmountPopupComponents } from './mount';
import { renderNamesEntries } from './names';
import { usePopupOptions } from './options-context';

export default function StandaloneNamesFixture() {
  const host = useRef<HTMLDivElement>(null);
  const { interactive, fontSize } = usePopupOptions();

  useLayoutEffect(() => {
    const popupHost = host.current;
    if (!popupHost) {
      return;
    }

    const controller: TtsPlaybackHandle = {
      state: { kind: 'idle' },
      subscribe: () => () => {},
      toggle: () => {},
    };
    const names = renderNamesEntries({
      entries: [
        {
          id: 1,
          k: ['佐藤'],
          r: ['さとう'],
          tr: [{ det: ['Sato'], type: ['surname'] }],
          matchLen: 2,
        },
      ],
      matchLen: 2,
      more: false,
      options: {
        copyState: { kind: 'inactive' },
        fontSize: fontSize ?? 'normal',
        fxData: undefined,
        interactive,
        preferredUnits: 'metric',
        ttsPlayback: controller,
      },
      popupHost,
    });
    popupHost.append(names);

    return () => {
      unmountPopupComponents(popupHost);
      names.remove();
    };
  }, [interactive, fontSize]);

  return <div ref={host} />;
}
