import browser from 'webextension-polyfill';

let pending: Promise<string | undefined> | undefined;

// Background is the only writer. Options obtains this value through runtime
// messaging, so initialization in different pages cannot create competing IDs.
// Do not cache the value after the read: clearing local storage must reset it.
export function getInstallationId(): Promise<string | undefined> {
  pending ??= readOrCreateId().finally(() => {
    pending = undefined;
  });
  return pending;
}

async function readOrCreateId(): Promise<string | undefined> {
  try {
    const { installid } = await browser.storage.local.get('installid');
    // Preserve existing base-36 IDs and UUIDs, as well as the hex IDs created
    // here. Never derive an ID from an extension URL.
    if (
      typeof installid === 'string' &&
      (/^(?:[a-z0-9]{10}|[0-9a-f]{32})$/.test(installid) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          installid
        ))
    ) {
      return installid;
    }

    // getRandomValues also works on supported Safari versions before 15.4.
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    await browser.storage.local.set({ installid: id });
    return id;
  } catch {
    // An unavailable local store means no persistent identity. Omit the ID;
    // do not report this failure or let diagnostics break dictionary use.
    return undefined;
  }
}
