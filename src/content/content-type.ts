export type ContentType = 'text' | 'image';

export function getContentType(elem: Element): ContentType {
  return ['IMG', 'PICTURE', 'VIDEO'].includes(elem.tagName) ? 'image' : 'text';
}
