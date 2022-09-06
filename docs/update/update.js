// This needs to be in a separate file because of the CSP policy for
// extension pages which doesn't allow inline scripts.
window.addEventListener('DOMContentLoaded', () => {
  // Allow links to open the options window.
  const optionsLinks = document.querySelectorAll('.options-link');
  for (const link of Array.from(optionsLinks)) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  // Translate keys for Mac users
  if (isMac()) {
    const kbdElems = document.querySelectorAll('kbd[data-mac]');
    for (const elem of Array.from(kbdElems)) {
      if (elem.dataset.mac) {
        elem.textContent = elem.dataset.mac;
      }
    }
  }
});

function isMac() {
  return /^Mac/i.test(navigator.platform);
}
