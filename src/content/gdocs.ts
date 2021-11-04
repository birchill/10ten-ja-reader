export function injectGdocsStyles() {
  const style = document.createElement('style');
  style.id = 'tenten-gdocs-styles';
  style.textContent = `.kix-canvas-tile-selection { pointer-events: none }
.kix-canvas-tile-content g rect[aria-label] { pointer-events: all }`;
  (document.head || document.documentElement).appendChild(style);
}

export function removeGdocsStyles() {
  document.getElementById('tenten-gdocs-styles')?.remove();
}
