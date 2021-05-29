import { RcxDict } from './data';
import { RcxMain } from './rikaichan';
import { configPromise } from './configuration';
import { tts } from './texttospeech';

/**
 * Returns a promise for fully initialized RcxMain. Async due to config and
 * RcxDict initialization.
 */
async function createRcxMainPromise(): Promise<RcxMain> {
  const config = await configPromise;
  const dict = await RcxDict.create(config);
  return RcxMain.create(dict, config);
}
const rcxMainPromise: Promise<RcxMain> = createRcxMainPromise();

chrome.browserAction.onClicked.addListener(async (tab) => {
  const rcxMain = await rcxMainPromise;
  rcxMain.inlineToggle(tab);
});
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const rcxMain = await rcxMainPromise;
  rcxMain.onTabSelect(activeInfo.tabId);
});
chrome.runtime.onMessage.addListener(async (request, sender, response) => {
  const rcxMain = await rcxMainPromise;
  switch (request.type) {
    case 'enable?':
      console.log('enable?');
      if (sender.tab === undefined) {
        throw TypeError('sender.tab is always defined here.');
      }
      rcxMain.onTabSelect(sender.tab.id);
      break;
    case 'xsearch':
      console.log('xsearch');
      const e = rcxMain.search(request.text, request.dictOption);
      response(e);
      break;
    case 'resetDict':
      console.log('resetDict');
      rcxMain.resetDict();
      break;
    case 'translate':
      console.log('translate');
      const translateEntry = rcxMain.dict.translate(request.title);
      response(translateEntry);
      break;
    case 'makehtml':
      console.log('makehtml');
      const html = rcxMain.dict.makeHtml(request.entry);
      response(html);
      break;
    case 'switchOnlyReading':
      console.log('switchOnlyReading');
      chrome.storage.sync.set({
        onlyreading: !rcxMain.config.onlyreading,
      });
      break;
    case 'copyToClip':
      console.log('copyToClip');
      rcxMain.copyToClip(sender.tab, request.entry);
      break;
    case 'playTTS':
      console.log('playTTS');
      tts.play(request.text);
      break;
    default:
      console.log(request);
  }
});

// Clear browser action badge text on first load
// Chrome preserves last state which is usually 'On'
chrome.browserAction.setBadgeText({ text: '' });
