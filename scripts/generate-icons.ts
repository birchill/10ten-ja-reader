import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { Browser, chromium } from 'playwright';
import { create, fragment } from 'xmlbuilder2';

const DEST_FOLDER = url.fileURLToPath(new URL('../images', import.meta.url));
const SVG_NS = 'http://www.w3.org/2000/svg';

async function main() {
  const browser = await chromium.launch();

  for (const style of ['10', '天'] as const) {
    for (const enabled of [true, false]) {
      // Generic icons
      await saveIcon({ browser, enabled, sizes: [16, 32, 48, 96, 128], style });

      // Progress icons
      for (const progress of [
        0,
        20,
        40,
        60,
        80,
        100,
        'indeterminate',
      ] as const) {
        for (const color of ['green', 'blue', 'purple'] as const) {
          await saveIcon({
            browser,
            enabled,
            progress: { value: progress, color },
            sizes: [16, 32, 48],
            style,
          });
        }
      }
    }

    // Error icons
    await saveIcon({
      badge: 'error',
      browser,
      enabled: false,
      sizes: [16, 32, 48],
      style,
    });
  }

  await browser.close();
}

async function saveIcon({
  badge,
  browser,
  enabled,
  progress,
  sizes,
  style,
}: {
  badge?: 'error';
  browser: Browser;
  enabled: boolean;
  progress?: {
    value: 0 | 20 | 40 | 60 | 80 | 100 | 'indeterminate';
    color: 'green' | 'blue' | 'purple';
  };
  sizes: Array<16 | 32 | 48 | 96 | 128>;
  style: '10' | '天';
}) {
  // Filename
  const filenameParts = ['10ten'];
  if (style === '天') {
    filenameParts.push('sky');
  }
  if (!enabled && badge !== 'error') {
    filenameParts.push('disabled');
  }
  if (badge === 'error') {
    filenameParts.push('error');
  }
  if (progress) {
    const { value, color } = progress;
    filenameParts.push(typeof value === 'number' ? `${value}p` : value);
    filenameParts.push(color);
  }

  // SVG version
  const svg = generateSvg({ badge, enabled, progress, size: 32, style });
  const filename = filenameParts.join('-') + '.svg';
  console.log(`Writing ${filename}...`);
  fs.writeFileSync(path.join(DEST_FOLDER, filename), svg);

  // PNG versions
  for (const size of sizes) {
    const page = await browser.newPage();
    const svg = generateSvg({ badge, enabled, progress, size, style });
    const svgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    await page.setContent(
      `<html><body><img id="img" src="${svgUrl}" width="${size}" height="${size}"></body></html>`
    );
    const filename = filenameParts.join('-') + `-${size}.png`;
    const dest = path.join(DEST_FOLDER, filename);
    console.log(`Writing ${filename}...`);
    await page.locator('#img').screenshot({ omitBackground: true, path: dest });
  }
}

const COLORS = {
  green: ['green', 'lime'],
  blue: ['#004d91', '#26bdfb'],
  purple: ['#5b006e', '#e458fa'],
};

function generateSvg({
  badge,
  enabled,
  progress,
  size,
  style,
}: {
  badge?: 'error';
  enabled: boolean;
  progress?: {
    value: 0 | 20 | 40 | 60 | 80 | 100 | 'indeterminate';
    color: 'green' | 'blue' | 'purple';
  };
  size: 16 | 32 | 48 | 96 | 128;
  style: '10' | '天';
}) {
  const svg = create().ele('svg', {
    xmlns: SVG_NS,
    viewBox: `0 0 ${size} ${size}`,
  });

  // Progress bar gradient
  if (progress) {
    if (size > 48) {
      throw new Error('Progress bar is only supported for sizes <= 48');
    }

    const gradientDimension = {
      16: {
        x1: '-.42',
        x2: '-.42',
        y1: -137.42,
        y2: -137.5,
        gradientTransform: 'translate(6 -2735) scale(10 -20)',
      },
      32: {
        x1: -16.4,
        x2: -16.4,
        y1: -138.09,
        y2: -138.24,
        gradientTransform: 'translate(168 -2735) scale(10 -20)',
      },
      48: {
        x1: -46.87,
        x2: -46.87,
        y1: -138.76,
        y2: -138.99,
        gradientTransform: 'translate(474 -2735) scale(10 -20)',
      },
    };

    svg
      .ele('defs')
      .ele('linearGradient', {
        id: 'linear-gradient',
        ...gradientDimension[size as 16 | 32 | 48],
        gradientUnits: 'userSpaceOnUse',
      })
      .ele('stop', { offset: '.2', 'stop-color': COLORS[progress.color][1] })
      .up()
      .ele('stop', { offset: 1, 'stop-color': COLORS[progress.color][0] });
  }

  // Background
  const backgroundRounding = { 16: 2.5, 32: 5, 48: 7.5, 96: 15, 128: 20 };
  svg.ele('rect', {
    width: size,
    height: size,
    fill: enabled ? '#1d1a19' : 'white',
    opacity: enabled ? undefined : '0.5',
    rx: backgroundRounding[size],
  });

  // 10ten logo
  svg.import(getLogo({ enabled, size, style }));

  // Progress bar
  if (progress) {
    if (size > 48) {
      throw new Error('Progress bar is only supported for sizes <= 48');
    }

    svg.import(
      getProgressBar({
        color: progress.color,
        enabled,
        value: progress.value,
        size: size as 16 | 32 | 48,
      })
    );
  }

  // Error badge
  if (badge === 'error') {
    if (progress) {
      throw new Error('Error badge is not supported with progress bar');
    }
    if (enabled) {
      throw new Error('Error badge is only shown in disabled state');
    }
    if (size > 48) {
      throw new Error('Error badge is only supported for sizes <= 48');
    }
    svg.import(getErrorBadge(size as 16 | 32 | 48));
  }

  return svg.end({ headless: true, prettyPrint: true });
}

function getLogo({
  enabled,
  size,
  style,
}: {
  enabled: boolean;
  size: 16 | 32 | 48 | 96 | 128;
  style: '10' | '天';
}) {
  const blueDot = {
    '10': {
      16: { cx: 13.5, cy: 11.5, r: 0.9 },
      32: { cx: 26.5, cy: 22.5, r: 1.8 },
      48: { cx: 39.5, cy: 34, r: 2.7 },
      96: { cx: 73, cy: 64.5, r: 4.5 },
      128: { cx: 98, cy: 86, r: 6 },
    },
    天: {
      16: { cx: 13.5, cy: 11.5, r: 1.1 },
      32: { cx: 27, cy: 23, r: 1.82 },
      48: { cx: 40, cy: 34.5, r: 2.7 },
      96: { cx: 74.5, cy: 66, r: 4.55 },
      128: { cx: 99, cy: 86, r: 6 },
    },
  };
  const yellowDot = {
    '10': {
      16: { cx: 9, cy: 8, r: 0.9 },
      32: { cx: 18, cy: 16, r: 1.8 },
      48: { cx: 27, cy: 24, r: 2.7 },
      96: { cx: 52, cy: 48, r: 4.5 },
      128: { cx: 70, cy: 64, r: 6 },
    },
    天: {
      16: { cx: 2.5, cy: 4.5, r: 1.1 },
      32: { cx: 5, cy: 9.5, r: 1.82 },
      48: { cx: 8, cy: 14, r: 2.7 },
      96: { cx: 21.5, cy: 31, r: 4.55 },
      128: { cx: 29, cy: 40, r: 6 },
    },
  };
  const logoPath = {
    '10': {
      16: 'M3.2 6.8c0-.66-.54-1.2-1.2-1.2V3.8c1.66 0 3 1.34 3 3v5.4H3.2V6.8Zm5.8-3c-1.66 0-3 1.34-3 3v2.4c0 1.66 1.34 3 3 3s3-1.34 3-3V6.8c0-1.66-1.34-3-3-3Zm1.2 5.4c0 .66-.54 1.2-1.2 1.2s-1.2-.54-1.2-1.2V6.8c0-.66.54-1.2 1.2-1.2s1.2.54 1.2 1.2v2.4Z',
      32: 'M6.4 13.6c0-1.33-1.07-2.4-2.4-2.4V7.6c3.31 0 6 2.69 6 6v10.8H6.4V13.6Zm11.6-6c-3.31 0-6 2.69-6 6v4.8c0 3.31 2.69 6 6 6s6-2.69 6-6v-4.8c0-3.31-2.69-6-6-6Zm2.4 10.8c0 1.33-1.07 2.4-2.4 2.4s-2.4-1.07-2.4-2.4v-4.8c0-1.33 1.07-2.4 2.4-2.4s2.4 1.07 2.4 2.4v4.8Z',
      48: 'M9.6 20.4c0-1.99-1.61-3.6-3.6-3.6v-5.4a9 9 0 0 1 9 9v16.2H9.6V20.4Zm17.4-9a9 9 0 0 0-9 9v7.2a9 9 0 0 0 18 0v-7.2a9 9 0 0 0-9-9Zm3.6 16.2c0 1.99-1.61 3.6-3.6 3.6s-3.6-1.61-3.6-3.6v-7.2c0-1.99 1.61-3.6 3.6-3.6s3.6 1.61 3.6 3.6v7.2Z',
      96: 'M24 42c0-3.31-2.69-6-6-6v-9c8.28 0 15 6.72 15 15v27h-9V42Zm28-15c-8.28 0-15 6.72-15 15v12c0 8.28 6.72 15 15 15s15-6.72 15-15V42c0-8.28-6.72-15-15-15Zm6 27c0 3.31-2.69 6-6 6s-6-2.69-6-6V42c0-3.31 2.69-6 6-6s6 2.69 6 6v12Z',
      128: 'M32 56c0-4.42-3.58-8-8-8V36c11.05 0 20 8.95 20 20v36H32V56Zm38-20c-11.05 0-20 8.95-20 20v16c0 11.05 8.95 20 20 20s20-8.95 20-20V56c0-11.05-8.95-20-20-20Zm8 36c0 4.42-3.58 8-8 8s-8-3.58-8-8V56c0-4.42 3.58-8 8-8s8 3.58 8 8v16Z',
    },
    天: {
      16: 'M3.86 4c.09.19.15.28.15.5s-.05.31-.15.5H6v2H3.5c-.34 0-.6.16-.6.5s.26.5.6.5l2.83.03c-.19.55-.46 1.12-.96 1.61-.64.64-1.45 1.13-2.43 1.46-.4.14-.6.59-.42.97.16.34.55.51.9.38 1.84-.7 3.19-1.85 3.84-3.34.65 1.48 2 2.63 3.84 3.34.35.13.75-.04.9-.38a.711.711 0 0 0-.42-.97c-.98-.34-1.79-.83-2.43-1.46-.5-.49-.77-1.1-.96-1.65H11c.34 0 .6-.16.6-.5s-.26-.5-.6-.5H8v-2h3.45c.34 0 .61-.16.61-.5s-.27-.5-.61-.5H3.86Z',
      32: 'M8 8c.18.37.3 1.06.3 1.5S8.18 10.63 8 11h5v3H7c-.67 0-1.4.83-1.4 1.5S6.33 17 7 17h5.5c-.38 1.07-.73 1.06-1.71 2.02-1.25 1.24-2.84 2.2-4.75 2.86-.78.27-1.17 1.14-.82 1.89.31.66 1.08 1 1.77.74 3.59-1.38 6.23-3.61 7.49-6.51 1.27 2.9 3.9 5.14 7.49 6.51.68.26 1.45-.08 1.77-.74.35-.74-.03-1.62-.82-1.89-1.91-.66-3.5-1.61-4.75-2.86-.97-.97-1.3-.95-1.68-2.02h5.5c.67 0 1.4-.83 1.4-1.5s-.73-1.5-1.4-1.5h-6v-3h7c.67 0 1.4-.83 1.4-1.5S23.66 8 22.99 8H8Z',
      48: 'M11.92 12c.27.54.58 1.36.58 2s-.31 1.46-.58 2H20v4h-9c-1 0-2 1.01-2 2s1 2 2 2h8c-.56 1.59-1.26 2.88-2.71 4.31-1.86 1.84-4.2 3.25-7.03 4.23-1.16.4-1.73 1.69-1.21 2.8.46.97 1.6 1.48 2.61 1.09 5.32-2.04 9.22-5.35 11.09-9.64 1.87 4.29 5.77 7.6 11.09 9.64 1.01.39 2.15-.12 2.61-1.09.52-1.1-.05-2.4-1.21-2.8-2.83-.98-5.17-2.39-7.03-4.23-1.44-1.43-2.16-2.72-2.72-4.31h8.5c1 0 2-1.01 2-2s-1-2-2-2h-9v-4h10c1 0 2-1.01 2-2s-1-2-2-2H11.92Z',
      96: 'M27.5 28c.46.92.75 1.91.75 3s-.29 2.08-.75 3H41v8H26c-1.68 0-3 1.33-3 3s1.32 3 3 3h14c-.95 2.69-2.6 5.19-5.04 7.61-3.14 3.12-7.11 5.5-11.9 7.15-1.96.68-2.93 2.87-2.04 4.73.78 1.64 2.71 2.51 4.42 1.85 9-3.45 15.59-9.05 18.77-16.31 3.17 7.26 9.77 12.86 18.77 16.31 1.71.65 3.64-.21 4.42-1.85.88-1.87-.08-4.05-2.04-4.73-4.79-1.65-8.76-4.04-11.9-7.15-2.44-2.42-3.76-4.92-4.7-7.61h13.25c1.68 0 3-1.33 3-3s-1.32-3-3-3h-14v-8H64.7c1.68 0 3-1.33 3-3s-1.31-3-3-3H27.5Z',
      128: 'M37.05 36c.6 1.21.95 2.56.95 4s-.35 2.79-.95 4H54v10H35c-2.22 0-4 1.8-4 4s1.78 4 4 4h18c-1.25 3.54-2.97 7.2-6.19 10.39-4.14 4.11-9.37 7.25-15.68 9.43-2.59.89-3.86 3.78-2.69 6.24 1.03 2.17 3.57 3.3 5.83 2.44C46.14 85.96 54.83 78.57 59.01 69c4.18 9.57 12.87 16.96 24.74 21.5 2.25.86 4.8-.27 5.83-2.44 1.16-2.46-.11-5.34-2.69-6.24-6.31-2.18-11.54-5.32-15.68-9.43-3.22-3.19-4.94-6.85-6.19-10.39h18c2.22 0 4-1.8 4-4s-1.78-4-4-4h-19V44h22c2.22 0 3.95-1.8 3.95-4s-1.73-4-3.95-4H37.05Z',
    },
  };

  return fragment()
    .ele('circle', {
      ...blueDot[style][size],
      fill: enabled ? '#2698fb' : '#4a4a4b',
    })
    .up()
    .ele('circle', {
      ...yellowDot[style][size],
      fill: enabled ? '#ffd500' : '#4a4a4b',
    })
    .up()
    .ele('path', {
      d: logoPath[style][size],
      fill: enabled ? 'white' : '#4a4a4b',
    })
    .up();
}

function getProgressBar({
  color,
  enabled,
  value,
  size,
}: {
  color: 'green' | 'blue' | 'purple';
  enabled: boolean;
  value: 0 | 20 | 40 | 60 | 80 | 100 | 'indeterminate';
  size: 16 | 32 | 48;
}) {
  const backgroundPath = {
    16: 'M2.17 13h11.66c.64 0 1.17.52 1.17 1.17 0 .64-.52 1.17-1.17 1.17H2.17c-.64 0-1.17-.52-1.17-1.17 0-.64.52-1.17 1.17-1.17Z',
    32: 'M4.75 26h22.5c1.24 0 2.25 1.01 2.25 2.25s-1.01 2.25-2.25 2.25H4.75c-1.24 0-2.25-1.01-2.25-2.25S3.51 26 4.75 26Z',
    48: 'M6.5 39h35c1.93 0 3.5 1.57 3.5 3.5S43.43 46 41.5 46h-35C4.57 46 3 44.43 3 42.5S4.57 39 6.5 39Z',
  };
  const barPath = {
    0: {
      16: 'M2.17 13.39v1.56c-.39 0-.78-.39-.78-.78s.39-.78.78-.78Z',
      32: 'M4.75 26.75v3c-.75 0-1.5-.75-1.5-1.5s.75-1.5 1.5-1.5Z',
      48: 'M6.5 40.17v4.67c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
    20: {
      16: 'M2.17 13.39h2.31v1.54H2.17c-.38 0-.77-.38-.77-.77s.38-.77.77-.77Z',
      32: 'M4.75 26.75H9.2v2.97H4.75c-.74 0-1.48-.74-1.48-1.48s.74-1.48 1.48-1.48Z',
      48: 'M6.5 40.17h7v4.67h-7c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
    40: {
      16: 'M2.17 13.39h4.66v1.56H2.17c-.39 0-.78-.39-.78-.78s.39-.78.78-.78Z',
      32: 'M4.75 26.75h9v3h-9c-.75 0-1.5-.75-1.5-1.5s.75-1.5 1.5-1.5Z',
      48: 'M6.5 40.17h14v4.67h-14c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
    60: {
      16: 'M2.17 13.39h7v1.56h-7c-.39 0-.78-.39-.78-.78s.39-.78.78-.78Z',
      32: 'M4.75 26.75h13.5v3H4.75c-.75 0-1.5-.75-1.5-1.5s.75-1.5 1.5-1.5Z',
      48: 'M6.5 40.17h21v4.67h-21c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
    80: {
      16: 'M2.17 13.39h9.33v1.56H2.17c-.39 0-.78-.39-.78-.78s.39-.78.78-.78Z',
      32: 'M4.75 26.75h18v3h-18c-.75 0-1.5-.75-1.5-1.5s.75-1.5 1.5-1.5Z',
      48: 'M6.5 40.17h28v4.67h-28c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
    100: {
      16: 'M2.19 13.39h11.67c.39 0 .78.39.78.78s-.39.78-.78.78H2.19c-.39 0-.78-.39-.78-.78s.39-.78.78-.78Z',
      32: 'M4.8 26.75h22.5c.75 0 1.5.75 1.5 1.5s-.75 1.5-1.5 1.5H4.8c-.75 0-1.5-.75-1.5-1.5s.75-1.5 1.5-1.5Z',
      48: 'M6.5 40.17h35c1.17 0 2.33 1.17 2.33 2.33s-1.17 2.33-2.33 2.33h-35c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
  };
  const indeterminatePath = {
    16: 'm2.19 14.94 1.5-1.56h1.13l-1.5 1.56H2.19Zm2.25 0 1.5-1.56h1.13l-1.5 1.56H4.44Zm2.25 0 1.5-1.56h1.13l-1.5 1.56H6.69Zm2.25 0 1.5-1.56h1.13l-1.5 1.56H8.94Zm2.25 0 1.5-1.56h1.13l-1.5 1.56h-1.13Z',
    32: 'm4.8 29.75 2.9-3h2.17l-2.9 3H4.8Zm4.35 0 2.9-3h2.17l-2.9 3H9.15Zm4.35 0 2.9-3h2.17l-2.9 3H13.5Zm4.35 0 2.9-3h2.17l-2.9 3h-2.17Zm4.35 0 2.9-3h2.17l-2.9 3H22.2Z',
    48: 'm6.57 44.83 4.44-4.67h3.33L9.9 44.83H6.57Zm6.66 0 4.44-4.67H21l-4.44 4.67h-3.33Zm6.66 0 4.44-4.67h3.33l-4.44 4.67h-3.33Zm6.66 0 4.44-4.67h3.33l-4.44 4.67h-3.33Zm6.66 0 4.44-4.67h3.33l-4.44 4.67h-3.33Z',
  };

  const result = fragment();
  result
    .ele('path', {
      d: backgroundPath[size],
      fill: enabled ? undefined : '#4a4a4b',
      'fill-opacity': enabled ? '.7' : undefined,
    })
    .up()
    .ele('path', {
      d: barPath[value === 'indeterminate' ? 100 : value][size],
      fill: 'url(#linear-gradient)',
    });

  if (value === 'indeterminate') {
    result.ele('path', { d: indeterminatePath[size], fill: COLORS[color][0] });
  }

  return result;
}

function getErrorBadge(size: 16 | 32 | 48) {
  const trianglePath = {
    16: 'M14.76 3.28 13.52.8a.488.488 0 0 0-.67-.22.47.47 0 0 0-.22.22l-1.24 2.48a.5.5 0 0 0 .45.72h2.48c.28 0 .5-.22.5-.5 0-.08-.02-.15-.05-.22Z',
    32: 'm30.88 7.34-2.85-5.7c-.28-.57-.98-.8-1.54-.51-.22.11-.4.29-.51.51l-2.85 5.7A1.149 1.149 0 0 0 24.16 9h5.7c.64 0 1.15-.51 1.15-1.15 0-.18-.04-.35-.12-.51Z',
    48: 'm46 11.16-4.27-8.55a1.728 1.728 0 0 0-3.09 0l-4.27 8.55c-.42.85-.08 1.89.78 2.31.24.12.5.18.77.18h8.55a1.73 1.73 0 0 0 1.55-2.5Z',
  };
  const exclamationMark = {
    16: 'M12.79 1.47c0-.14.13-.25.29-.25s.29.11.29.25v1c0 .14-.13.25-.29.25s-.29-.11-.29-.25v-1Zm.29 2.1a.29.29 0 1 1 0-.58.29.29 0 0 1 0 .58Z',
    32: 'M26.33 3.18c0-.32.3-.58.67-.58s.67.26.67.58v2.3c0 .32-.3.58-.67.58s-.67-.26-.67-.58v-2.3ZM27 8a.67.67 0 1 1 0-1.34A.67.67 0 0 1 27 8Z',
    48: 'M39.18 4.93c0-.48.45-.86 1-.86s1 .39 1 .86v3.45c0 .48-.45.86-1 .86s-1-.39-1-.86V4.93Zm1 7.23c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1Z',
  };

  return fragment()
    .ele('path', { d: trianglePath[size], fill: '#f24b59' })
    .up()
    .ele('path', { d: exclamationMark[size], fill: 'white' })
    .up();
}

main()
  .then(() => {
    console.log('Done.');
  })
  .catch((e) => {
    console.error('Unhandled error');
    console.error(e);
    process.exit(1);
  });
