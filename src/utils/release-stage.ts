import { browser } from 'webextension-polyfill-ts';

let releaseStage: 'production' | 'development' = 'production';

if (browser.management) {
  browser.management.getSelf().then((info) => {
    if (info.installType === 'development') {
      releaseStage = 'development';
    }
  });
}

export function getReleaseStage(): 'production' | 'development' {
  return releaseStage;
}
