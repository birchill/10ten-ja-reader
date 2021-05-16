import { rcxMain } from './rikaichan';
import { tts } from './texttospeech';

chrome.browserAction.onClicked.addListener(rcxMain.inlineToggle);
chrome.tabs.onActivated.addListener((activeInfo) => {
  rcxMain.onTabSelect(activeInfo.tabId);
});
chrome.runtime.onMessage.addListener(function (request, sender, response) {
  switch (request.type) {
    case 'enable?':
      console.log('enable?');
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
      rcxMain.config.onlyreading = !rcxMain.config.onlyreading;
      chrome.storage.sync.set({
        onlyreading: rcxMain.config.onlyreading,
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
