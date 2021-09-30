import { browser } from 'webextension-polyfill-ts';

browser.runtime
  .sendMessage({ type: 'forceGdocsHtmlMode' })
  .then((forceHtml: boolean) => {
    if (!forceHtml) {
      return;
    }

    console.info(
      '[10ten-ja-reader] 10ten Japanese Reader is causing Google Docs to render in HTML mode instead of canvas mode. To use canvas mode, please open the 10ten Japanese reader options.'
    );

    const scriptElem = document.createElement('script');
    scriptElem.textContent = `(function() { window['_docs_force_html_by_ext'] = 'pnmaklegiibbioifkmfkgpfnmdehdfan'; })();`;

    const head = document.head || document.documentElement;
    head.append(scriptElem);
  });
