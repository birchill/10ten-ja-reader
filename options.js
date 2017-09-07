function fillVals() {
  var store = localStorage['popupcolor'];
  for (var i = 0; i < document.optform.popupcolor.length; ++i) {
    if (document.optform.popupcolor[i].value == store) {
      document.optform.popupcolor[i].selected = true;
      break;
    }
  }

  if (localStorage['highlight'] == 'true')
    document.optform.highlighttext.checked = true;
  else document.optform.highlighttext.checked = false;

  if (localStorage['textboxhl'] == 'true')
    document.optform.textboxhl.checked = true;
  else document.optform.textboxhl.checked = false;

  if (localStorage['onlyreading'] == 'true')
    document.optform.onlyreading.checked = true;
  else document.optform.onlyreading.checked = false;

  if (localStorage['minihelp'] == 'true')
    document.optform.minihelp.checked = true;
  else document.optform.minihelp.checked = false;

  document.optform.popupDelay.value = localStorage['popupDelay'];

  if (localStorage['disablekeys'] == 'true')
    document.optform.disablekeys.checked = true;
  else document.optform.disablekeys.checked = false;

  if (localStorage['kanjicomponents'] == 'true')
    document.optform.kanjicomponents.checked = true;
  else document.optform.kanjicomponents.checked = false;

  const abbreviations = browser.extension.getBackgroundPage().REF_ABBREVIATIONS;
  for (let ref of abbreviations) {
    document.getElementById(ref.abbrev).checked =
      localStorage[ref.abbrev] === 'true';
  }

  store = localStorage['lineEnding'];
  for (var i = 0; i < document.optform.lineEnding.length; ++i) {
    if (document.optform.lineEnding[i].value == store) {
      document.optform.lineEnding[i].selected = true;
      break;
    }
  }

  store = localStorage['copySeparator'];
  for (var i = 0; i < document.optform.copySeparator.length; ++i) {
    if (document.optform.copySeparator[i].value == store) {
      document.optform.copySeparator[i].selected = true;
      break;
    }
  }

  document.optform.maxClipCopyEntries.value = parseInt(
    localStorage['maxClipCopyEntries']
  );

  store = localStorage['showOnKey'];
  for (var i = 0; i < document.optform.showOnKey.length; ++i) {
    if (document.optform.showOnKey[i].value === store) {
      document.optform.showOnKey[i].checked = true;
      break;
    }
  }
}

function getVals() {
  localStorage['popupcolor'] = document.optform.popupcolor.value;
  localStorage['highlight'] = document.optform.highlighttext.checked;
  localStorage['textboxhl'] = document.optform.textboxhl.checked;
  localStorage['onlyreading'] = document.optform.onlyreading.checked;
  localStorage['minihelp'] = document.optform.minihelp.checked;
  localStorage['disablekeys'] = document.optform.disablekeys.checked;
  localStorage['kanjicomponents'] = document.optform.kanjicomponents.checked;

  const kanjiInfo = {};
  const abbreviations = browser.extension.getBackgroundPage().REF_ABBREVIATIONS;
  for (let ref of abbreviations) {
    localStorage[ref.abbrev] = document.getElementById(ref.abbrev).checked;
    kanjiInfo[ref.abbrev] = localStorage[ref.abbrev];
  }

  localStorage['lineEnding'] = document.optform.lineEnding.value;
  localStorage['copySeparator'] = document.optform.copySeparator.value;
  localStorage['maxClipCopyEntries'] =
    document.optform.maxClipCopyEntries.value;

  var popupDelay;
  try {
    popupDelay = parseInt(document.optform.popupDelay.value);
    if (!isFinite(popupDelay)) {
      throw Error('infinite');
    }
    localStorage['popupDelay'] = document.optform.popupDelay.value;
  } catch (err) {
    popupDelay = 150;
    localStorage['popupDelay'] = '150';
  }
  localStorage['showOnKey'] = document.optform.showOnKey.value;

  browser.extension.getBackgroundPage().rcxMain.config.css =
    localStorage['popupcolor'];
  browser.extension.getBackgroundPage().rcxMain.config.highlight =
    localStorage['highlight'];
  browser.extension.getBackgroundPage().rcxMain.config.textboxhl =
    localStorage['textboxhl'];
  browser.extension.getBackgroundPage().rcxMain.config.onlyreading =
    localStorage['onlyreading'];
  browser.extension.getBackgroundPage().rcxMain.config.minihelp =
    localStorage['minihelp'];
  browser.extension.getBackgroundPage().rcxMain.config.popupDelay = popupDelay;
  browser.extension.getBackgroundPage().rcxMain.config.disablekeys =
    localStorage['disablekeys'];
  browser.extension.getBackgroundPage().rcxMain.config.showOnKey =
    localStorage['showOnKey'];
  browser.extension.getBackgroundPage().rcxMain.config.kanjicomponents =
    localStorage['kanjicomponents'];
  browser.extension.getBackgroundPage().rcxMain.config.kanjiinfo = kanjiInfo;
  browser.extension.getBackgroundPage().rcxMain.config.lineEnding =
    localStorage['lineEnding'];
  browser.extension.getBackgroundPage().rcxMain.config.copySeparator =
    localStorage['copySeparator'];
  browser.extension.getBackgroundPage().rcxMain.config.maxClipCopyEntries =
    localStorage['maxClipCopyEntries'];
}
window.onload = fillVals;

document.querySelector('#submit').addEventListener('click', getVals);
