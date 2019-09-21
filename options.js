//TODO: A FEW COMMENTS WOULDN'T HURT THIS CLASS
function getOptions() {
	chrome.storage.sync.get(optionsList,
		function (items) {

			for (var i = 0; i < document.optform.popupcolor.length; ++i) {
				if (document.optform.popupcolor[i].value == items['popupcolor']) {
					document.optform.popupcolor[i].selected = true;
					break;
				}
			}

			document.optform.popupLocation.selectedIndex = items.popupLocation;
			document.optform.highlighttext.checked = items.highlight;
			document.optform.textboxhl.checked = items.textboxhl;
			document.optform.onlyreading.checked = items.onlyreading;
			document.optform.minihelp.checked = items.minihelp;
			document.optform.disablekeys.checked = items.disablekeys;
			document.optform.kanjicomponents.checked = items.kanjicomponents;
			document.optform.popupDelay.value = items.popupDelay;

			kanjiInfoLabelList = chrome.extension.getBackgroundPage().rcxDict.prototype.kanjiInfoLabelList;

			for (i = 0; i * 2 < kanjiInfoLabelList.length; i++) {
				// Need to get every other element in the storage, so this funky math was added.
				// We have abbreviations and values..

				document.getElementById(kanjiInfoLabelList[i * 2]).checked = items.kanjiInfo[kanjiInfoLabelList[i * 2]] //== 'true' ? true : false;
			}

			for (var i = 0; i < document.optform.lineEnding.length; ++i) {
				if (document.optform.lineEnding[i].value === items.lineEnding) {
					document.optform.lineEnding[i].selected = true;
					break;
				}
			}

			for (var i = 0; i < document.optform.copySeparator.length; ++i) {
				if (document.optform.copySeparator[i].value === items.copySeparator) {
					document.optform.copySeparator[i].selected = true;
					break;
				}
			}

			document.optform.maxClipCopyEntries.value = parseInt(items.maxClipCopyEntries);

			for (var i = 0; i < document.optform.showOnKey.length; ++i) {
				if (document.optform.showOnKey[i].value === items.showOnKey) {
					document.optform.showOnKey[i].checked = true;
					break;
				}
			}

		});
}

function saveOptions() {
	//Todo: Add Ordering of variables
	var popupcolor = document.optform.popupcolor.value;
	var highlight = document.optform.highlighttext.checked;
	var textboxhl = document.optform.textboxhl.checked;
	var onlyreading = document.optform.onlyreading.checked;
	var minihelp = document.optform.minihelp.checked;
	var disablekeys = document.optform.disablekeys.checked;
	var kanjicomponents = document.optform.kanjicomponents.checked;
	var lineEnding = document.optform.lineEnding.value;
	var copySeparator = document.optform.copySeparator.value;
	var maxClipCopyEntries = parseInt(document.optform.maxClipCopyEntries.value);
	var popupDelay = getPopUpDelay();
	var popupLocation = document.optform.popupLocation.value;
	var showOnKey = document.optform.showOnKey.value;
	var kanjiInfoObject = {};

	// Setting Kanji values
	for (i = 0; i * 2 < kanjiInfoLabelList.length; i++) {
		kanjiInfoObject[kanjiInfoLabelList[i * 2]] = document.getElementById(kanjiInfoLabelList[i * 2]).checked;
	}

	chrome.storage.sync.set({
		// Saving General options
		"disablekeys": disablekeys,
		"highlight": highlight,
		"kanjicomponents": kanjicomponents,
		"kanjiInfo": kanjiInfoObject,
		"minihelp": minihelp,
		"onlyreading": onlyreading,
		"popupcolor": popupcolor,
		"popupDelay": popupDelay,
		"popupLocation": popupLocation,
		"showOnKey": showOnKey,
		"textboxhl": textboxhl,

		// Saving Copy to Clipboard settings
		"copySeparator": copySeparator,
		"lineEnding": lineEnding,
		"maxClipCopyEntries": maxClipCopyEntries
	});

	chrome.extension.getBackgroundPage().rcxMain.config.copySeparator = copySeparator;
	chrome.extension.getBackgroundPage().rcxMain.config.popupcolor = popupcolor;
	chrome.extension.getBackgroundPage().rcxMain.config.disablekeys = disablekeys;
	chrome.extension.getBackgroundPage().rcxMain.config.highlight = highlight;
	chrome.extension.getBackgroundPage().rcxMain.config.kanjicomponents = kanjicomponents;
	chrome.extension.getBackgroundPage().rcxMain.config.kanjiinfo = kanjiInfoObject;
	chrome.extension.getBackgroundPage().rcxMain.config.lineEnding = lineEnding;
	chrome.extension.getBackgroundPage().rcxMain.config.maxClipCopyEntries = maxClipCopyEntries;
	chrome.extension.getBackgroundPage().rcxMain.config.minihelp = minihelp;
	chrome.extension.getBackgroundPage().rcxMain.config.onlyreading = onlyreading;
	chrome.extension.getBackgroundPage().rcxMain.config.popupDelay = popupDelay;
	chrome.extension.getBackgroundPage().rcxMain.config.popupLocation = popupLocation;
	chrome.extension.getBackgroundPage().rcxMain.config.showOnKey = showOnKey;
	chrome.extension.getBackgroundPage().rcxMain.config.textboxhl = textboxhl;

}

function getPopUpDelay() {
	var popupDelay;
	try {
		popupDelay = parseInt(document.optform.popupDelay.value);
		if (!isFinite(popupDelay)) {
			throw Error('infinite');
		}
	} catch (err) {
		popupDelay = 150;
	}
	return popupDelay;
}

window.onload = getOptions;
document.querySelector('#submit').addEventListener('click', saveOptions);


/*function clicktab(tab) {
	selectedtab = document.getElementById(tab);
	// change format of all tabs to deselected
	// change format of selected tab to selected
	// hide all tab contents
	// show selected tab contents
}*/
