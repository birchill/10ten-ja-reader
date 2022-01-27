import { HTML_NS, SVG_NS } from './dom-utils';

// Little helper to simplify creating HTML elements that takes care of:
//
// - Adding the HTML namespace (needed so the popup works in standalong SVG
//   documents)
// - Returning the correct type (TypeScript's lib.dom.d.ts has createElementNS
//   returning an HTMLElement in all cases, unlike createElement).
// - Setting attributes (for convenience)
export function html<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes?: { [key: string]: string | undefined },
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const elem = document.createElementNS(
    HTML_NS,
    tagName
  ) as HTMLElementTagNameMap[K];

  if (attributes) {
    for (const key in attributes) {
      const val = attributes[key];
      if (typeof val !== 'undefined') {
        elem.setAttribute(key, val);
      }
    }
  }

  if (children) {
    elem.append(...children);
  }

  return elem;
}

export function svg<K extends keyof SVGElementTagNameMap>(
  tagName: K,
  attributes?: { [key: string]: string | undefined },
  ...children: Array<Node | string>
): SVGElementTagNameMap[K] {
  const elem = document.createElementNS(
    SVG_NS,
    tagName
  ) as SVGElementTagNameMap[K];

  if (attributes) {
    for (const key in attributes) {
      const val = attributes[key];
      if (typeof val !== 'undefined') {
        elem.setAttribute(key, val);
      }
    }
  }

  if (children) {
    elem.append(...children);
  }

  return elem;
}
