function get_options() {
	chrome.storage.sync.get(optionsList,
		function(items) {

			for(var i=0; i < document.optform.popupcolor.length; ++i) {
				if(document.optform.popupcolor[i].value == items['popupcolor']) {
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

			for (i = 0; i*2 < kanjiInfoLabelList.length; i++) {
				// Need to get every other element in the storage, so this funky math was added.
				// We have abbreviations and values..

				document.getElementById(kanjiInfoLabelList[i*2]).checked = items.kanjiInfo[kanjiInfoLabelList[i*2]] //== 'true' ? true : false;
			}

			for(var i=0; i < document.optform.lineEnding.length; ++i) {
				if(document.optform.lineEnding[i].value === items.lineEnding) {
				// Get the user input
				function save_options() {
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
					var maxClipCopyEntries = document.optform.maxClipCopyEntries.value;
					var popupDelay = getPopUpDelay();
					var popupLocation =document.optform.popupLocation.value;
					var showOnKey = document.optform.showOnKey.value;
					var kanjiInfoObject = {};
					var kanjiInfoLabelList = chrome.extension.getBackgroundPage().rcxDict.prototype.kanjiInfoLabelList;
					var kanjiinfoarray = new Array(kanjiInfoLabelList.length/2);

					// Setting Kanji values
					for (i = 0; i*2 < kanjiInfoLabelList.length; i++) {
						kanjiInfoObject[kanjiInfoLabelList[i * 2]] = document.getElementById(kanjiInfoLabelList[i * 2]).checked;
						//Todo: Figure out why there are two duplicate arrays...
						kanjiinfoarray[i] = kanjiInfoObject[kanjiInfoLabelList[i * 2]];
					}

					chrome.storage.sync.set({
						// Saving General options
						"popupcolor": popupcolor,
						"highlight": highlight,
						"textboxhl": textboxhl,
						"onlyreading": onlyreading,
						"minihelp": minihelp,
						"disablekeys": disablekeys,
						"kanjicomponents": kanjicomponents,
						"kanjiInfo":kanjiInfoObject,
						"popupLocation":popupLocation,
						// Saving Copy to Clipboard settings
						"lineEnding": lineEnding,
						"copySeparator": copySeparator,
						"maxClipCopyEntries": maxClipCopyEntries,
						"popupDelay": popupDelay,
						"showOnKey":showOnKey
					});

					chrome.extension.getBackgroundPage().rcxMain.config.css = popupcolor;
					chrome.extension.getBackgroundPage().rcxMain.config.highlight = highlight;
					chrome.extension.getBackgroundPage().rcxMain.config.textboxhl = textboxhl;
					chrome.extension.getBackgroundPage().rcxMain.config.onlyreading = onlyreading;
					chrome.extension.getBackgroundPage().rcxMain.config.minihelp = minihelp;
					chrome.extension.getBackgroundPage().rcxMain.config.popupDelay = popupDelay;
					chrome.extension.getBackgroundPage().rcxMain.config.disablekeys = disablekeys;
					chrome.extension.getBackgroundPage().rcxMain.config.showOnKey = showOnKey;
					chrome.extension.getBackgroundPage().rcxMain.config.kanjicomponents = kanjicomponents;
					chrome.extension.getBackgroundPage().rcxMain.config.kanjiinfo = kanjiinfoarray;
					chrome.extension.getBackgroundPage().rcxMain.config.lineEnding = lineEnding;
					chrome.extension.getBackgroundPage().rcxMain.config.copySeparator = copySeparator;
					chrome.extension.getBackgroundPage().rcxMain.config.maxClipCopyEntries = maxClipCopyEntries;
					chrome.extension.getBackgroundPage().rcxMain.config.popupLocation = popupLocation;

				}


				function getPopUpDelay(){
					var popupDelay;
					try {
						popupDelay = parseInt(document.optform.popupDelay.value);
						if (!isFinite(popupDelay)) {
							throw Error('infinite');
						}
					} catch (err) {
						popupDelay = 150;
						popupDelay: "150";
					}
					return popupDelay;
				}
				window.onload = get_options;

				/*function clicktab(tab) {
					selectedtab = document.getElementById(tab);
					// change format of all tabs to deselected
					// change format of selected tab to selected
					// hide all tab contents
					// show selected tab contents
				}*/


				document.querySelector('#submit').addEventListener('click', save_options);



				document.optform.lineEnding[i].selected = true;
				break;
			}
	}

	for(var i=0; i < document.optform.copySeparator.length; ++i) {
		if(document.optform.copySeparator[i].value === items.copySeparator) {
			document.optform.copySeparator[i].selected = true;
			break;
		}
	}

	document.optform.maxClipCopyEntries.value = parseInt(items.maxClipCopyEntries);

	for(var i = 0; i < document.optform.showOnKey.length; ++i) {
		if (document.optform.showOnKey[i].value === items.showOnKey) {
			document.optform.showOnKey[i].checked = true;
			break;
		}
	}

		});
}



function getPopUpDelay(){
	// Todo: Why do we need a popup delay?
	var popupDelay;
	try {
		popupDelay = parseInt(document.optform.popupDelay.value);
		if (!isFinite(popupDelay)) {
			throw Error('infinite');
		}
	} catch (err) {
		popupDelay = 150;
		popupDelay: "150";
	}
	return popupDelay;
}
window.onload = get_options;

/*function clicktab(tab) {
	selectedtab = document.getElementById(tab);
	// change format of all tabs to deselected
	// change format of selected tab to selected
	// hide all tab contents
	// show selected tab contents
}*/


document.querySelector('#submit').addEventListener('click', save_options);


