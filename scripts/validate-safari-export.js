import * as childProcess from 'node:child_process';
import * as process from 'node:process';

function main() {
  const [summaryPath, pkgPath] = process.argv.slice(2);
  if (!summaryPath || !pkgPath) {
    throw new Error(
      'Usage: node scripts/validate-safari-export.js <distribution-summary-plist> <pkg-path>'
    );
  }

  const summary = readPlist(summaryPath);
  const pkgEntries = Object.entries(summary);
  assert(
    pkgEntries.length === 1,
    'Expected exactly one package in the export summary'
  );

  const [pkgName, packageSummaries] = pkgEntries[0];
  assert(
    pkgName === '10ten Japanese Reader.pkg',
    `Unexpected package name: ${pkgName}`
  );
  assert(
    Array.isArray(packageSummaries) && packageSummaries.length === 1,
    'Expected exactly one top-level package summary'
  );

  const appSummary = packageSummaries[0];
  assertEqual(appSummary.name, '10ten Japanese Reader.app', 'App name');
  assertIncludesAll(
    appSummary.architectures,
    ['arm64', 'x86_64'],
    'App architectures'
  );
  assertEqual(
    appSummary.certificate?.type,
    'Apple Distribution',
    'App signing certificate'
  );
  assertEqual(
    appSummary.profile?.name,
    '10ten Japanese Reader App Store Connect (Mac)',
    'App provisioning profile'
  );
  assertEqual(appSummary.team?.id, 'H3RB7C8768', 'App team ID');
  assertEntitlements(
    appSummary.entitlements,
    {
      'com.apple.application-identifier':
        'H3RB7C8768.jp.co.birchill.tenten-ja-reader',
      'com.apple.developer.team-identifier': 'H3RB7C8768',
      'com.apple.security.app-sandbox': true,
      'com.apple.security.files.user-selected.read-only': true,
      'com.apple.security.network.client': true,
    },
    'App'
  );
  assertMissingEntitlements(
    appSummary.entitlements,
    ['com.apple.security.get-task-allow'],
    'App'
  );

  assert(
    Array.isArray(appSummary.embeddedBinaries) &&
      appSummary.embeddedBinaries.length === 1,
    'Expected exactly one embedded binary in the macOS app'
  );

  const extensionSummary = appSummary.embeddedBinaries[0];
  assertEqual(
    extensionSummary.name,
    '10ten Japanese Reader Extension.appex',
    'Extension name'
  );
  assertIncludesAll(
    extensionSummary.architectures,
    ['arm64', 'x86_64'],
    'Extension architectures'
  );
  assertEqual(
    extensionSummary.certificate?.type,
    'Apple Distribution',
    'Extension signing certificate'
  );
  assertEqual(
    extensionSummary.profile?.name,
    '10ten Japanese Reader Extension App Store ConnectM',
    'Extension provisioning profile'
  );
  assertEqual(extensionSummary.team?.id, 'H3RB7C8768', 'Extension team ID');
  assertEntitlements(
    extensionSummary.entitlements,
    {
      'com.apple.application-identifier':
        'H3RB7C8768.jp.co.birchill.tenten-ja-reader.Extension',
      'com.apple.developer.team-identifier': 'H3RB7C8768',
      'com.apple.security.app-sandbox': true,
      'com.apple.security.files.user-selected.read-only': true,
    },
    'Extension'
  );
  assertMissingEntitlements(
    extensionSummary.entitlements,
    ['com.apple.security.get-task-allow', 'com.apple.security.network.client'],
    'Extension'
  );

  const pkgSignature = childProcess.execFileSync(
    'pkgutil',
    ['--check-signature', pkgPath],
    { encoding: 'utf8' }
  );
  assert(
    pkgSignature.includes(
      '3rd Party Mac Developer Installer: Birchill, Inc. (H3RB7C8768)'
    ),
    'Package is not signed with the expected installer certificate'
  );

  console.log('Validated Safari export metadata successfully.');
}

function readPlist(path) {
  const json = childProcess.execFileSync(
    'plutil',
    ['-convert', 'json', '-o', '-', path],
    { encoding: 'utf8' }
  );
  return JSON.parse(json);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, label) {
  assert(
    actual === expected,
    `${label}: expected '${expected}', got '${actual}'`
  );
}

function assertIncludesAll(actual, expected, label) {
  assert(Array.isArray(actual), `${label}: expected an array`);
  for (const entry of expected) {
    assert(actual.includes(entry), `${label}: missing '${entry}'`);
  }
}

function assertEntitlements(actual, expected, label) {
  assert(
    actual && typeof actual === 'object',
    `${label} entitlements are missing`
  );
  for (const [key, value] of Object.entries(expected)) {
    assert(
      actual[key] === value,
      `${label} entitlement '${key}': expected '${value}', got '${actual[key]}'`
    );
  }
}

function assertMissingEntitlements(actual, unexpectedKeys, label) {
  assert(
    actual && typeof actual === 'object',
    `${label} entitlements are missing`
  );
  for (const key of unexpectedKeys) {
    assert(
      !(key in actual),
      `${label} entitlement '${key}' should not be present`
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
