import browser from 'webextension-polyfill';

let releaseStage: 'production' | 'development' = 'production';

if (browser.management) {
  browser.management
    .getSelf()
    .then((info) => {
      if (info.installType === 'development') {
        releaseStage = 'development';
      }
    })
    .catch((e) => {
      console.warn(e);
    });
}

export function getReleaseStage(): 'production' | 'development' {
  return releaseStage;
}
