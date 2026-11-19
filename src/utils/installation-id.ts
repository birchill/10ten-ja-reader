import browser from 'webextension-polyfill';

export const INSTALLATION_ID_KEY = 'installid';

let pending: Promise<string | undefined> | undefined;

// Background is the only writer. Other contexts read the stored value or ask
// background for an ID when preparing a report.
// Do not cache the value after the read: clearing local storage must reset it.
export function getInstallationId(): Promise<string | undefined> {
  pending ??= readOrCreateId().finally(() => {
    pending = undefined;
  });
  return pending;
}

export async function readInstallationId(): Promise<string | undefined> {
  const { [INSTALLATION_ID_KEY]: id } =
    await browser.storage.local.get(INSTALLATION_ID_KEY);

  // Preserve existing base-36 IDs and UUIDs, as well as the hex IDs we create.
  if (
    typeof id === 'string' &&
    (/^(?:[a-z0-9]{10}|[0-9a-f]{32})$/.test(id) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        id
      ))
  ) {
    return id;
  }

  return undefined;
}

async function readOrCreateId(): Promise<string | undefined> {
  try {
    const existingId = await readInstallationId();
    if (existingId) {
      return existingId;
    }

    // getRandomValues also works on supported Safari versions before 15.4.
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    await browser.storage.local.set({ [INSTALLATION_ID_KEY]: id });
    return id;
  } catch {
    // An unavailable local store means no persistent identity. Omit the ID;
    // do not report this failure or let diagnostics break dictionary use.
    return undefined;
  }
}
