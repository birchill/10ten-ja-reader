export function getPopupContainer(): HTMLElement | null {
  const hostElem = document.getElementById('tenten-ja-window');
  return hostElem && hostElem.shadowRoot
    ? hostElem.shadowRoot.querySelector('.container')
    : null;
}

export function isPopupWindowHostElem(
  target: EventTarget | Node | null
): boolean {
  return target instanceof HTMLElement && target.id === 'tenten-ja-window';
}
