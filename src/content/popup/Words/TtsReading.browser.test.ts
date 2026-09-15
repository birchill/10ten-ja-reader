import type { WordResult } from '@birchill/jpdict-idb';
import type { ComponentChild } from 'preact';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import type { AccentDisplay } from '../../../common/content-config-params';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import '../popup.css';

import { Reading } from './Reading';
import { TtsReading, type TtsReadingProps } from './TtsReading';

type Kana = WordResult['r'][0];

const idleController: TtsReadingProps['controller'] = {
  get state(): TtsPlaybackState {
    return { kind: 'idle' };
  },
  subscribe(listener) {
    listener({ kind: 'idle' });
    return () => {};
  },
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('TtsReading geometry', () => {
  const cases: Array<{
    name: string;
    kana: Kana;
    accentDisplay: AccentDisplay;
  }> = [
    {
      name: 'binary nakadaka',
      kana: { ent: 'たべる', a: 2 } as Kana,
      accentDisplay: 'binary',
    },
    {
      name: 'binary heiban',
      kana: { ent: 'さくら', a: 0 } as Kana,
      accentDisplay: 'binary',
    },
    {
      name: 'high-contrast nakadaka',
      kana: { ent: 'たべる', a: 2 } as Kana,
      accentDisplay: 'binary-hi-contrast',
    },
    {
      name: 'downstep heiban',
      kana: { ent: 'さくら', a: 0 } as Kana,
      accentDisplay: 'downstep',
    },
    {
      name: 'downstep with a mark',
      kana: { ent: 'たべる', a: 2 } as Kana,
      accentDisplay: 'downstep',
    },
  ];

  for (const { name, kana, accentDisplay } of cases) {
    it(`matches the static reading for ${name}`, () => {
      const staticRoot = mount(h(Reading, { kana, accentDisplay }));
      const ttsRoot = mount(
        h(TtsReading, {
          controller: idleController,
          entryIndex: 0,
          readingIndex: 0,
          kana,
          accentDisplay,
        })
      );

      const glyphLayer = ttsRoot.firstElementChild!
        .firstElementChild as HTMLElement;

      // The animated reading must sit on the same accent geometry as the
      // static one, or switching playback on nudges every pitch line.
      const glyphBoxes = accentBoxes(glyphLayer, ttsRoot);
      expect(glyphBoxes).toEqual(accentBoxes(staticRoot, staticRoot));
      expect(glyphLayer.textContent).toBe(staticRoot.textContent);

      // The ink is revealed one mora at a time, so it need not be grouped like
      // the dotted line underneath. It does have to sit on the same edge.
      const inkLayer = ttsRoot.firstElementChild!.children[1] as
        HTMLElement | undefined;
      if (inkLayer) {
        expect(new Set(accentBoxes(inkLayer, ttsRoot).map(edgeOf))).toEqual(
          new Set(glyphBoxes.map(edgeOf))
        );
      }
    });
  }
});

// Which edges a box draws, and where its line sits, dropping the text and
// width that grouping is allowed to differ on.
function edgeOf(box: string): string {
  const [, edges, width, y, height] = box.split('|');
  return [edges, width, y, height].join('|');
}

function mount(vnode: ComponentChild): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = [
    'position: fixed',
    'inset: 40px auto auto 40px',
    'font-family: sans-serif',
    // Mirror the popup's text-xl: an absolute line-height much taller than
    // the 90%-scaled glyphs, which is what exposes a line-box-sized border.
    'font-size: 18px',
    'line-height: 24.5px',
    'color: rgb(96, 96, 96)',
    '--hi-contrast-pitch-accent: rgb(0, 0, 0)',
  ].join(';');
  document.body.append(container);
  act(() => {
    render(vnode, container);
  });

  return container;
}

function accentBoxes(layer: HTMLElement, originOf: HTMLElement): Array<string> {
  const origin = originOf.getBoundingClientRect();

  return [...layer.querySelectorAll<HTMLElement>('span')]
    .filter((span) => {
      const style = getComputedStyle(span);
      return (
        style.borderTopWidth !== '0px' ||
        style.borderBottomWidth !== '0px' ||
        style.borderRightWidth !== '0px'
      );
    })
    .map((span) => {
      const style = getComputedStyle(span);
      const box = span.getBoundingClientRect();
      const edges = [
        style.borderTopWidth === '0px' ? '' : 'top',
        style.borderBottomWidth === '0px' ? '' : 'bottom',
        style.borderRightWidth === '0px' ? '' : 'right',
      ]
        .filter(Boolean)
        .join('+');

      return [
        span.textContent,
        edges,
        style.borderTopWidth,
        `y=${(box.top - origin.top).toFixed(1)}`,
        `h=${box.height.toFixed(1)}`,
        `w=${box.width.toFixed(1)}`,
      ].join('|');
    });
}
