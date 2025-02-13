import browser from 'webextension-polyfill';

import { svg } from '../../utils/builder';

export function renderBook(): SVGElement {
  const bookSvg = svg(
    'svg',
    { viewBox: '0 0 16 16', role: 'presentation' },
    svg('path', {
      d: 'M14,2H10.09a2.16,2.16,0,0,0-.71.12l-1.11.41a.83.83,0,0,1-.54,0L6.62,2.12A2.16,2.16,0,0,0,5.91,2H2A2,2,0,0,0,0,4v8a2,2,0,0,0,2.05,2H5.91a.76.76,0,0,1,.27.05l1.12.4a1.95,1.95,0,0,0,1.4,0L10.33,14l.84,0a.84.84,0,0,0,.71-.8c0-.67-.76-.69-.76-.69a5.17,5.17,0,0,0-1.25.12L9,13V4l.07,0,1.11-.4a.86.86,0,0,1,.27,0h3.27a.78.78,0,0,1,.78.78V9A.75.75,0,0,0,16,9V4A2,2,0,0,0,14,2ZM7,13l-.76-.33a1.85,1.85,0,0,0-.7-.13H2.28a.78.78,0,0,1-.78-.78V4.28a.78.78,0,0,1,.78-.78H5.54a.75.75,0,0,1,.26,0L6.92,4,7,4Z',
    })
  );

  const lineGroup = svg('g', {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-linecap': 'round',
  });
  bookSvg.append(lineGroup);

  const lines = [
    [3, 7.5, 5.5, 7.5],
    [3, 5.5, 5.5, 5.5],
    [3, 9.5, 5.5, 9.5],
    [10.5, 7.5, 13, 7.5],
    [10.5, 5.5, 13, 5.5],
    [10.5, 9.5, 11.5, 9.5],
  ];
  for (const [x1, y1, x2, y2] of lines) {
    const line = svg('line', {
      x1: String(x1),
      y1: String(y1),
      x2: String(x2),
      y2: String(y2),
    });
    lineGroup.append(line);
  }

  const circle = svg('circle', { cx: '14.5', cy: '12.5', r: '1.5' });
  bookSvg.append(circle);

  return bookSvg;
}

export function renderClipboard(): SVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', role: 'presentation', fill: 'currentColor' },
    svg('circle', { cx: '19.5', cy: '21.5', r: '1.5' }),
    svg('path', {
      d: 'M10.46 5.54c0-.89.7-1.61 1.54-1.61s1.54.72 1.54 1.61v.65c0 .17-.14.32-.31.32h-2.46a.32.32 0 0 1-.31-.32v-.65zM15.97 20H6.9c-.5 0-.9-.46-.9-1V7.48c0-.54.4-.97.9-.97h1.74a2.19 2.19 0 0 0 2.13 1.94h2.46c1.07 0 1.98-.83 2.13-1.94h1.7c.5 0 .94.43.94.97V18a1 1 0 0 0 2 0V7.48c0-1.6-1.42-2.9-2.94-2.9h-1.8a3.37 3.37 0 0 0-4.2-2.44c-1.12.33-2 1.26-2.32 2.43H6.9c-1.53 0-2.9 1.3-2.9 2.9V19c0 1.6 1.47 3 3 3h8.97a1 1 0 1 0 0-2z',
    })
  );
}

export function renderCog(): SVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24' },
    svg('circle', {
      cx: '21.5',
      cy: '21.5',
      r: '1.5',
      fill: 'currentColor',
      stroke: 'none',
    }),
    svg('circle', { cx: '12', cy: '12', r: '4' }),
    svg('path', {
      d: 'M10.48 3.28a2 2 0 003 0 2.05 2.05 0 013.57 1.48 2.05 2.05 0 002.15 2.15 2.05 2.05 0 011.48 3.57 2 2 0 000 3 2.05 2.05 0 01-1.48 3.57 2.05 2.05 0 00-2.15 2.15 2.05 2.05 0 01-3.57 1.48 2 2 0 00-3 0 2.05 2.05 0 01-3.57-1.48 2.05 2.05 0 00-2.15-2.15 2.05 2.05 0 01-1.48-3.57 2 2 0 000-3 2.05 2.05 0 011.48-3.57 2.05 2.05 0 002.15-2.15 2.05 2.05 0 013.57-1.48z',
    })
  );
}

export function renderCross(): SVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24' },
    svg('path', { d: 'M6 18L18 6M6 6l12 12' })
  );
}

export function renderKanjiIcon(): SVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 16 16', role: 'presentation' },
    svg('circle', { cx: '14.5', cy: '14.5', r: '1.5' }),
    svg('path', {
      d: 'M11,15H2a2,2,0,0,1-2-2V2A2,2,0,0,1,2,0H13a2,2,0,0,1,2,2v9a1,1,0,0,1-2,0V2H2V13h9a1,1,0,0,1,0,2Z',
    }),
    svg('path', {
      d: 'M8.5,7H5V6h5V7H9.5l-1,1H12V9H8v2a1,1,0,0,1-.24.71A1.15,1.15,0,0,1,7,12H6V11H7V9H3V8H7.5ZM8,4h4V6H11V5H4V6H3V4H7V3H8Z',
    })
  );
}

export function renderPerson(): SVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 16 16', role: 'presentation' },
    svg('circle', { cx: '14.5', cy: '14.5', r: '1.5' }),
    svg('path', {
      d: 'M8,0A2.87,2.87,0,0,0,5,2.72v2.5A2.92,2.92,0,0,0,8,8a2.92,2.92,0,0,0,3-2.78V2.72A2.87,2.87,0,0,0,8,0Z',
    }),
    svg('path', {
      d: 'M13.91,11.71A5.09,5.09,0,0,0,9.45,9H5.09A5.18,5.18,0,0,0,0,14.25.74.74,0,0,0,.73,15h10.9a.74.74,0,0,0,.73-.75,1.49,1.49,0,0,1,1.09-1.45.75.75,0,0,0,.49-.43A.76.76,0,0,0,13.91,11.71Z',
    })
  );
}

export function renderPin(): SVGElement {
  return svg(
    'svg',
    { role: 'presentation', viewBox: '0 0 24 24' },
    svg('path', {
      d: 'm14 3 .593 1.833c.104.295.157.604.157.917v3.42l.666.236a2.759 2.759 0 0 1 1.834 2.591c0 .05 0 .197-.33.253a3.504 3.504 0 0 0-3.42 3.499c-.029.065-.283.251-.5.251h-1v4.75V16H8.904a2.156 2.156 0 0 1-2.154-2.154v-1.849a2.75 2.75 0 0 1 1.833-2.592l.667-.235V5.75c0-.313.053-.622.157-.916L10 3H8h8-2z',
      fill: 'none',
      stroke: 'currentColor',
    }),
    svg('circle', {
      cx: '18', // 18
      cy: '16.5', // 16.5
      r: '1.5',
      fill: 'currentColor',
      stroke: 'none',
    })
  );
}

export function renderSpinner(): SVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 16 16', role: 'presentation' },
    svg('path', {
      d: 'M8.54,2.11l.66-.65A.78.78,0,0,0,9.2.38a.76.76,0,0,0-1.08,0L6.19,2.31A.81.81,0,0,0,6,2.55a.8.8,0,0,0-.06.3A.72.72,0,0,0,6,3.14a.74.74,0,0,0,.17.25L8.12,5.32a.73.73,0,0,0,.54.22.76.76,0,0,0,.54-.22.78.78,0,0,0,0-1.08l-.58-.58A4.38,4.38,0,1,1,3.68,8.82a.76.76,0,0,0-1.5.28,5.92,5.92,0,1,0,6.36-7Z',
    }),
    svg('circle', { cx: '2.673', cy: '6.71', r: '0.965' })
  );
}

export function renderStar(style: 'full' | 'hollow'): SVGElement {
  const message =
    style === 'full'
      ? 'entry_priority_label_high'
      : 'entry_priority_label_regular';

  return svg(
    'svg',
    { class: 'svgicon', viewBox: '0 0 98.6 93.2', style: 'opacity: 0.5' },
    svg('title', {}, browser.i18n.getMessage(message)),
    svg('path', {
      d:
        style === 'full'
          ? 'M98 34a4 4 0 00-3-1l-30-4L53 2a4 4 0 00-7 0L33 29 4 33a4 4 0 00-3 6l22 20-6 29a4 4 0 004 5 4 4 0 002 0l26-15 26 15a4 4 0 002 0 4 4 0 004-4 4 4 0 000-1l-6-29 22-20a4 4 0 001-5z'
          : 'M77 93a4 4 0 004-4 4 4 0 000-1l-6-29 22-20a4 4 0 00-2-6l-30-4L53 2a4 4 0 00-7 0L33 29 4 33a4 4 0 00-3 6l22 20-6 29a4 4 0 004 5 4 4 0 002 0l26-15 26 15a4 4 0 002 0zm-5-12L51 70a4 4 0 00-4 0L27 81l5-22a4 4 0 00-1-4L13 40l23-3a4 4 0 004-2l9-21 10 21a4 4 0 003 2l23 3-17 15a4 4 0 00-1 4z',
    })
  );
}
