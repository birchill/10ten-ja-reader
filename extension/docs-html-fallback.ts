function forceHtml(force: boolean) {
  if (!force) {
    return;
  }
  console.log(
    'rikaikun is forcing Docs to use HTML instead of canvas for rendering.'
  );
  const injectedCode = `(function() {window['_docs_force_html_by_ext'] = '${chrome.runtime.id}';})();`;

  const script = document.createElement('script');

  script.textContent = injectedCode;

  // Usually, `document.head` isn't guaranteed to be present when content_scripts run but in this case
  // we're running inside a callback so it should be 100% safe.
  document.head.appendChild(script);
}

// This check allows the user to get newer Docs Canvas without disabling rikaikun.
// This delays when the forcing code is injected but it seems to be early enough in practice.
chrome.runtime.sendMessage({ type: 'forceDocsHtml?' }, forceHtml);

export { forceHtml as TestOnlyForceHtml };
