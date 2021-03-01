export async function shouldRequestPersistentStorage(): Promise<boolean> {
  // Prior to Firefox 77, Firefox would prompt the user if we request persistent
  // storage. That could be annyoing (especially if the user denies the request)
  // so we don't request persistent storage unless it looks like the user needs
  // it.
  const firefoxMajorVersion = getFirefoxMajorVersion();
  return (
    firefoxMajorVersion === null ||
    firefoxMajorVersion >= 77 ||
    (await wouldBenefitFromPersistentStorage())
  );
}

function getFirefoxMajorVersion(): number | null {
  const matches = navigator.userAgent.match(/\sFirefox\/([0-9.]+)/);
  if (!matches) {
    return null;
  }

  return Math.floor(parseFloat(matches[1]));
}

async function wouldBenefitFromPersistentStorage(): Promise<boolean> {
  let estimate: StorageEstimate;
  try {
    estimate = await navigator.storage.estimate();
  } catch (e) {
    console.warn('Failed to get storage estimate');
    console.log(e);
    return false;
  }

  // If we couldn't get an estimate, assume attempting to persist storage will
  // fail so just return false.
  if (
    typeof estimate.quota === 'undefined' ||
    typeof estimate.usage === 'undefined'
  ) {
    return false;
  }

  // We could use persistent storage if we have less than 200Mb for our quota or
  // are over 80% of our quota.
  const quotaInMb = estimate.quota / (1024 * 1024);
  const usageAsPercent = estimate.usage / estimate.quota;

  return quotaInMb < 200 || usageAsPercent > 0.8;
}
