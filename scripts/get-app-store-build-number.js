import * as crypto from 'node:crypto';
import * as process from 'node:process';

const API_BASE = 'https://api.appstoreconnect.apple.com/v1';

async function main() {
  const bundleId = process.argv[2];
  if (!bundleId) {
    throw new Error(
      'Usage: node scripts/get-app-store-build-number.js <bundle-id>'
    );
  }

  const issuerId = getRequiredEnv('APP_STORE_CONNECT_ISSUER_ID');
  const keyId = getRequiredEnv('APP_STORE_CONNECT_KEY_ID');
  const privateKey = getRequiredEnv('APP_STORE_CONNECT_PRIVATE_KEY');

  const token = createToken({ issuerId, keyId, privateKey });
  const appId = await getAppId({ bundleId, token });
  const maxBuildNumber = await getMaxBuildNumber({ appId, token });
  const nextBuildNumber = maxBuildNumber + 1;

  console.log(String(nextBuildNumber));
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createToken({ issuerId, keyId, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = {
    iss: issuerId,
    aud: 'appstoreconnect-v1',
    exp: now + 20 * 60,
  };

  const encodedHeader = encodeJson(header);
  const encodedPayload = encodeJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  return `${signingInput}.${base64Url(signature)}`;
}

function encodeJson(value) {
  return base64Url(Buffer.from(JSON.stringify(value)));
}

function base64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function getAppId({ bundleId, token }) {
  const url = new URL(`${API_BASE}/apps`);
  url.searchParams.set('filter[bundleId]', bundleId);
  url.searchParams.set('limit', '1');

  const response = await fetchJson({ url: url.toString(), token });
  const app = response.data?.[0];
  if (!app?.id) {
    throw new Error(`Failed to find app for bundle ID '${bundleId}'`);
  }

  return app.id;
}

async function getMaxBuildNumber({ appId, token }) {
  let nextUrl = new URL(`${API_BASE}/builds`);
  nextUrl.searchParams.set('filter[app]', appId);
  nextUrl.searchParams.set('fields[builds]', 'version');
  nextUrl.searchParams.set('limit', '200');

  let maxBuildNumber = 0;

  while (nextUrl) {
    const response = await fetchJson({ url: nextUrl.toString(), token });

    for (const build of response.data ?? []) {
      const version = build?.attributes?.version;
      if (!version || !/^\d+$/.test(version)) {
        continue;
      }
      maxBuildNumber = Math.max(maxBuildNumber, parseInt(version, 10));
    }

    nextUrl = response.links?.next ? new URL(response.links.next) : null;
  }

  return maxBuildNumber;
}

async function fetchJson({ url, token }) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `App Store Connect API request failed (${response.status} ${response.statusText}): ${body}`
    );
  }

  return response.json();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
