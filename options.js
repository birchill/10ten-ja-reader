function fillVals() {
	var store = localStorage['popupcolor'];
	for(var i=0; i < document.optform.popupcolor.length; ++i) {
		if(document.optform.popupcolor[i].value == store) {
			document.optform.popupcolor[i].selected = true;
			break;
		}
	}

	document.optform.popupLocation.selectedIndex = localStorage['popupLocation'];
	
	if (localStorage['highlight'] == 'true')
		document.optform.highlighttext.checked = true;
	else
		document.optform.highlighttext.checked = false;

	if (localStorage['textboxhl'] == 'true')
		document.optform.textboxhl.checked = true;
	else
		document.optform.textboxhl.checked = false;
	
	if (localStorage['onlyreading'] == 'true')
		document.optform.onlyreading.checked = true;
	else
		document.optform.onlyreading.checked = false;
	
	if (localStorage['minihelp'] == 'true')
		document.optform.minihelp.checked = true;
	else
		document.optform.minihelp.checked = false;

	document.optform.popupDelay.value = localStorage["popupDelay"];

	if (localStorage['disablekeys'] == 'true')
		document.optform.disablekeys.checked = true;
	else
		document.optform.disablekeys.checked = false;

	if (localStorage['kanjicomponents'] == 'true')
		document.optform.kanjicomponents.checked = true;
	else
		document.optform.kanjicomponents.checked = false;

	numList = chrome.extension.getBackgroundPage().rcxDict.prototype.numList;

	for (i = 0; i*2 < numList.length; i++) {
		document.getElementById(numList[i*2]).checked = localStorage[numList[i*2]] == 'true' ? true : false;
	}

	store = localStorage['lineEnding'];
	for(var i=0; i < document.optform.lineEnding.length; ++i) {
		if(document.optform.lineEnding[i].value == store) {
			document.optform.lineEnding[i].selected = true;
			break;
		}
	}

	store = localStorage['copySeparator'];
	for(var i=0; i < document.optform.copySeparator.length; ++i) {
		if(document.optform.copySeparator[i].value == store) {
			document.optform.copySeparator[i].selected = true;
			break;
		}
	}

	document.optform.maxClipCopyEntries.value = parseInt(localStorage['maxClipCopyEntries']);

	store = localStorage['showOnKey'];
	for(var i = 0; i < document.optform.showOnKey.length; ++i) {
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

	var kanjiinfoarray = new Array(chrome.extension.getBackgroundPage().rcxDict.prototype.numList.length/2);
	numList = chrome.extension.getBackgroundPage().rcxDict.prototype.numList;
	for (i = 0; i*2 < numList.length; i++) {
		localStorage[numList[i*2]] = document.getElementById(numList[i*2]).checked;
		kanjiinfoarray[i] = localStorage[numList[i*2]];
	}

	localStorage['lineEnding'] = document.optform.lineEnding.value;
	localStorage['copySeparator'] = document.optform.copySeparator.value;
	localStorage['maxClipCopyEntries'] = document.optform.maxClipCopyEntries.value;

	var popupDelay;
	try {
		popupDelay = parseInt(document.optform.popupDelay.value);
		if (!isFinite(popupDelay)) {
			throw Error('infinite');
		}
		localStorage['popupDelay'] = document.optform.popupDelay.value;
	} catch (err) {
		popupDelay = 150;
		localStorage['popupDelay'] = "150";
	}
	localStorage['showOnKey'] = document.optform.showOnKey.value;
	localStorage['popupLocation'] = document.optform.popupLocation.value;

	chrome.extension.getBackgroundPage().rcxMain.config.css = localStorage["popupcolor"];
	chrome.extension.getBackgroundPage().rcxMain.config.highlight = localStorage["highlight"];
	chrome.extension.getBackgroundPage().rcxMain.config.textboxhl = localStorage["textboxhl"];
	chrome.extension.getBackgroundPage().rcxMain.config.onlyreading = localStorage["onlyreading"];
	chrome.extension.getBackgroundPage().rcxMain.config.minihelp = localStorage["minihelp"];
	chrome.extension.getBackgroundPage().rcxMain.config.popupDelay = popupDelay;
	chrome.extension.getBackgroundPage().rcxMain.config.disablekeys = localStorage["disablekeys"];
	chrome.extension.getBackgroundPage().rcxMain.config.showOnKey = localStorage["showOnKey"];
	chrome.extension.getBackgroundPage().rcxMain.config.kanjicomponents = localStorage["kanjicomponents"];
	chrome.extension.getBackgroundPage().rcxMain.config.kanjiinfo = kanjiinfoarray;
	chrome.extension.getBackgroundPage().rcxMain.config.lineEnding = localStorage["lineEnding"];
	chrome.extension.getBackgroundPage().rcxMain.config.copySeparator = localStorage["copySeparator"];
	chrome.extension.getBackgroundPage().rcxMain.config.maxClipCopyEntries = localStorage["maxClipCopyEntries"];
	chrome.extension.getBackgroundPage().rcxMain.config.popupLocation = localStorage["popupLocation"];
}
window.onload = fillVals;

/*function clicktab(tab) {
	selectedtab = document.getElementById(tab);
	// change format of all tabs to deselected
	// change format of selected tab to selected
	// hide all tab contents
	// show selected tab contents
}*/


document.querySelector('#submit').addEventListener('click', getVals);

