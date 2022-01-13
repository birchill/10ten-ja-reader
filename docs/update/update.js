// Utility to allow links to open the options window.
//
// This needs to be in a separate file because of the CSP policy for
// extension pages which doesn't allow inline scripts.
window.addEventListener('DOMContentLoaded', () => {
  const optionsLinks = document.querySelectorAll('.options-link');
  for (const link of Array.from(optionsLinks)) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }
});
