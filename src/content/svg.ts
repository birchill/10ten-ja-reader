export const SVG_NS = 'http://www.w3.org/2000/svg';

export const isSvgDoc = (doc: Document): boolean => {
  return doc.documentElement.namespaceURI === SVG_NS;
};

export const isForeignObjectElement = (
  elem: Element | null
): elem is SVGForeignObjectElement =>
  !!elem &&
  elem.namespaceURI === SVG_NS &&
  elem.nodeName.toUpperCase() === 'FOREIGNOBJECT';

// This is only needed because Edge's WebIDL definitions are wrong
// (they have documentElement as having type HTMLElement)
export const isSvgSvgElement = (elem: Element | null): elem is SVGSVGElement =>
  !!elem &&
  elem.namespaceURI === SVG_NS &&
  elem.nodeName.toUpperCase() === 'SVG';
