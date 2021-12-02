import { SVG_NS } from '../svg';

export function renderClipboard(): SVGElement {
  const clipboardSvg = document.createElementNS(SVG_NS, 'svg');
  clipboardSvg.setAttribute('viewBox', '0 0 24 24');
  clipboardSvg.setAttribute('role', 'presentation');
  clipboardSvg.setAttribute('fill', 'currentColor');

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '19.5');
  circle.setAttribute('cy', '21.5');
  circle.setAttribute('r', '1.5');
  clipboardSvg.append(circle);

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    'M10.46 5.54c0-.89.7-1.61 1.54-1.61s1.54.72 1.54 1.61v.65c0 .17-.14.32-.31.32h-2.46a.32.32 0 0 1-.31-.32v-.65zM15.97 20H6.9c-.5 0-.9-.46-.9-1V7.48c0-.54.4-.97.9-.97h1.74a2.19 2.19 0 0 0 2.13 1.94h2.46c1.07 0 1.98-.83 2.13-1.94h1.7c.5 0 .94.43.94.97V18a1 1 0 0 0 2 0V7.48c0-1.6-1.42-2.9-2.94-2.9h-1.8a3.37 3.37 0 0 0-4.2-2.44c-1.12.33-2 1.26-2.32 2.43H6.9c-1.53 0-2.9 1.3-2.9 2.9V19c0 1.6 1.47 3 3 3h8.97a1 1 0 1 0 0-2z'
  );
  clipboardSvg.append(path);

  return clipboardSvg;
}
