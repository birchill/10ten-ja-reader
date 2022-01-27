import { html } from '../utils/builder';

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for non-HTTPS pages

    // We generate a copy event and then fill in the data in the event handler
    let callbackCalled = false;
    const copy = function (event: ClipboardEvent) {
      event.clipboardData!.setData('text/plain', text);
      event.preventDefault();
      callbackCalled = true;
    };
    document.addEventListener('copy', copy);
    document.execCommand('copy');
    document.removeEventListener('copy', copy);
    if (callbackCalled) {
      return;
    }

    // However, on Safari (of course it's Safari), if there is no current
    // selection in the page, the copy event callback will not be fired.
    //
    // In that case, try generating a selection to copy instead.
    const selection = document.getSelection();
    if (!selection) {
      throw new Error('No selection to work with');
    }

    // This isn't going to work if this is an SVG document but I'm quite happy
    // to accept that you can't copy text from SVG documents served over
    // insecure HTTP in Safari.
    const span = html('span', {}, text);
    (document.body || document.documentElement).append(span);

    // We would like to build up a specific Range here so we can cleanly remove
    // it later but Safari doesn't seem to handle `selection.addRange` properly.
    //
    // (From the console it works, but only if we use document.createRange,
    // _not_ if we use the Range constructor. From code, however, it doesn't
    // seem to work with either approach, possibly because the selection is
    // updated async?)
    //
    // Given that we only expect this to occur when there's no selection _and_
    // we're on an HTTP page it's probably not so bad if we end up moving the
    // selection.
    try {
      selection.selectAllChildren(span);
      document.execCommand('copy');
    } finally {
      // Tidy up
      //
      // It turns out Safari doesn't support Selection.removeRange anyway so we're
      // stuck dropping all the ranges even if we could create them.
      selection.removeAllRanges();
      span.remove();
    }
  }
}
