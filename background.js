/**
 * Version info
 *
 */

chrome.browserAction.onClicked.addListener(rcxMain.inlineToggle);
chrome.tabs.onSelectionChanged.addListener(rcxMain.onTabSelect);
chrome.runtime.onMessage.addListener(
	function (request, sender, response) {
		switch (request.type) {
			case 'enable?':
				console.log('enable?');
				rcxMain.onTabSelect(sender.tab.id);
				break;
			case 'xsearch':
				console.log('xsearch');
				var e = rcxMain.search(request.text, request.dictOption);
				response(e);
				break;
			/*  case 'nextDict':
								console.log('nextDict');
								rcxMain.nextDict();
								break;*/
			case 'resetDict':
				console.log('resetDict');
				rcxMain.resetDict();
				break;
			case 'translate':
				console.log('translate');
				var e = rcxMain.dict.translate(request.title);
				response(e);
				break;
			case 'makehtml':
				console.log('makehtml');
				var html = rcxMain.dict.makeHtml(request.entry);
				response(html);
				break;
			case 'switchOnlyReading':
				console.log('switchOnlyReading');
				if (rcxMain.config.onlyreading == 'true')
					rcxMain.config.onlyreading = 'false';
				else
					rcxMain.config.onlyreading = 'true';
				//Todo: Replace this with cloud storage
				localStorage['onlyreading'] = rcxMain.config.onlyreading;
				break;
			case 'copyToClip':
				console.log('copyToClip');
				rcxMain.copyToClip(sender.tab, request.entry);
				break;
			default:
				console.log(request);
		}
	})

var optionsList = [
	"copySeparator", // Is this field separator?
	"disablekeys",
	"highlight",
	"kanjicomponents",
	"kanjiInfo",
	"lineEnding",
	"maxClipCopyEntries",
	"minihelp",
	"onlyreading",
	"popupcolor",
	"popupDelay",
	"popupLocation",
	"textboxhl",
	"showOnKey"];

var kanjiInfoLabelList = rcxDict.prototype.kanjiInfoLabelList;
this.kanjiInfoObject = {}; //Object used to save kanjiinfo to cloud.
rcxMain.config = {};

/** Get option data from cloud. */
chrome.storage.sync.get(optionsList,
	function (items) {
		fillRcxValsFromLocalStoreCloudAndDefaultValues(items)
		saveOptionsToCloudStorage()

/**
 * Saves options to Google Chrome Cloud storage
 * https://developer.chrome.com/storage
 * @author Deshaun (From Dev Color)
 * @param None
 * @return None
 */
function saveOptionsToCloudStorage() {

	chrome.storage.sync.set({
		// Saving General options
		"copySeparator": rcxMain.config.copySeparator,
		"disablekeys": rcxMain.config.disablekeys,
		"highlight": rcxMain.config.highlight,
		"kanjicomponents": rcxMain.config.kanjicomponents,
		//Todo: Package contents of Kanji info object to store in cloud
		"kanjiInfo":kanjiInfoObject,
		"lineEnding": rcxMain.config.lineEnding,
		"maxClipCopyEntries": rcxMain.config.maxClipCopyEntries,
		"minihelp": rcxMain.config.minihelp,
		"onlyreading": rcxMain.config.onlyreading,
		"popupcolor": rcxMain.config.popupcolor,
		"popupDelay": rcxMain.config.popupDelay,
		"popupLocation":rcxMain.config.popupLocation,
		"textboxhl": rcxMain.config.textboxhl,

		// Saving Copy to Clipboard settings
		"showOnKey":rcxMain.config.showOnKey
	});

}

/**
 * Initializes the localStorage for the given key.
 * If the given key is already initialized, nothing happens.
 *
 * @author Teo (GD API Guru)
 * @param key The key for which to initialize
 * @param initialValue Initial value of localStorage on the given key
 * @return true if a value is assigned or false if nothing happens
 */
function initStorage(key, initialValue) {
	var currentValue = localStorage[key];
	if (!currentValue) {
		localStorage[key] = initialValue;
		return true;
	}
	return false;
}

/**
 * Populates config with option values from 3 places
 * 1. Cloud Storage, 2. Local Storage, and 3. Default
 * If any values are in local storage they will overwrite cloud storage values.
 * Values should no longer be saved to local storage.
 *
 * @author Deshaun (From Dev Color)
 * @param items option values retrieved from cloud storage
 * @return None
 */
function fillRcxValsFromLocalStoreCloudAndDefaultValues(items) {
	/*
		For Each Option Value below,
		Condition 1: Cloud Storage Value
		Condition 2: Local Storage Value
		Condition 3: Default Value
	 */

	if (initStorage("v0.8.92", true)) {
		/** Useful old versioning logic */
		// 	if (initStorage("v0.8.92", true)) {
		// 		// v0.7
		// 		// initStorage("popupcolor", "blue");
		// 		initStorage("highlight", true);
		//
		// 		// v0.8
		// 		// No changes to options
		//
		// 		// V0.8.5
		// 		initStorage("textboxhl", false);
		//
		//
		// });

		// v0.8.8
		// Backward compatibility logic may drop soon.
		if (localStorage['highlight'] == "yes")
			localStorage['highlight'] = "true";
		if (localStorage['highlight'] == "no")
			localStorage['highlight'] = "false";
		if (localStorage['textboxhl'] == "yes")
			localStorage['textboxhl'] = "true";
		if (localStorage['textboxhl'] == "no")
			localStorage['textboxhl'] = "false";
		if (localStorage['onlyreading'] == "yes")
			localStorage['onlyreading'] = "true";
		if (localStorage['onlyreading'] == "no")
			localStorage['onlyreading'] = "false";
	}

		//Todo: Need to Organize these options in alphabetical order.
		/** Set Copy Separator Option value */
		if (items.copySeparator) {
			rcxMain.config.copySeparator = items.copySeparator;
		}

		if (localStorage["copySeparator"]) {
			rcxMain.config.copySeparator = localStorage["copySeparator"];
		}

		if (!rcxMain.config.copySeparator) {
			rcxMain.config.copySeparator = "tab"
		}
		echo(rcxMain.config.copySeparator);

		/** Set Disable Keys option value */
		if (items.disablekeys) {
			rcxMain.config.disablekeys = items.disablekeys;
		}

		if (localStorage["disablekeys"]) {
			rcxMain.config.disablekeys = localStorage["disablekeys"];
		}

		if (!rcxMain.config.disablekeys)
			rcxMain.config.disablekeys = "false"
	}

	/** Set highlight option value */
	if (items.highlight) {
		rcxMain.config.highlight = items.highlight;
	}

	if (localStorage["highlight"]) {
		rcxMain.config.highlight = localStorage["highlight"];
	}

	if (!rcxMain.config.highlight) {
		rcxMain.config.highlight = true
	}

	/** Set kanji components option value */
	if (items.kanjicomponents) {
		rcxMain.config.kanjicomponents = items.kanjicomponents;
	}

	if (localStorage["kanjicomponents"]) {
		rcxMain.config.kanjicomponents = localStorage["kanjicomponents"];
	}

	if (!rcxMain.config.kanjicomponents) {
		rcxMain.config.kanjicomponents = "true"
	}

	/** Set kanjiinfo option values */
	rcxMain.config.kanjiinfo = new Array(kanjiInfoLabelList.length / 2);
	for (i = 0; i * 2 < kanjiInfoLabelList.length; i++) {
		if (items.kanjiinfo[kanjiInfoLabelList[i * 2]]) {
			rcxMain.config.kanjiinfo[i] = items.kanjiinfo[kanjiInfoLabelList[i * 2]];
		}

		if (localStorage[kanjiInfoLabelList[i * 2]]) {
			rcxMain.config.kanjiinfo[i] = localStorage[kanjiInfoLabelList[i * 2]];
		}

		if (!rcxMain.config.kanjiinfo) {
			rcxMain.config.kanjiinfo[i] = "true"
		}

		// Saving each option value to kanjiInfoObject to be stored in cloud later.
		this.kanjiInfoObject[kanjiInfoLabelList[i * 2]] = rcxMain.config.kanjiinfo[i];

	}

	/** Set lineEnding option value */
	if (items.lineEnding) {
		rcxMain.config.lineEnding = items.lineEnding;
	}

	if (localStorage["lineEnding"]) {
		rcxMain.config.lineEnding = localStorage["lineEnding"];
	}

	if (!rcxMain.config.lineEnding) {
		rcxMain.config.lineEnding = "n"
	}

	/** Set maxClipCopyEntries option value */
	if (items.maxClipCopyEntries) {
		rcxMain.config.maxClipCopyEntries = items.maxClipCopyEntries;
	}

	if (localStorage["maxClipCopyEntries"]) {
		rcxMain.config.maxClipCopyEntries = localStorage["maxClipCopyEntries"];
	}

	if (!rcxMain.config.maxClipCopyEntries) {
		rcxMain.config.maxClipCopyEntries = "7"
	}

	/** Set minihelp option value */
	if (items.minihelp) {
		rcxMain.config.minihelp = items.minihelp;
	}

	if (localStorage["minihelp"]) {
		rcxMain.config.minihelp = localStorage["minihelp"];
	}

	if (!rcxMain.config.minihelp) {
		rcxMain.config.minihelp = "true"
	}

	/** Set onlyreading option value */
	if (items.onlyreading) {
		rcxMain.config.onlyreading = items.onlyreading;
	}

	if (localStorage["onlyreading"]) {
		rcxMain.config.onlyreading = localStorage["onlyreading"];
	}

	if (!rcxMain.config.onlyreading) {
		rcxMain.config.onlyreading = false
	}

	/** Set popupcolor option value */
	if (items.popupcolor) {
		rcxMain.config.popupcolor = items.popupcolor;
	}

	if (localStorage["popupcolor"]) {
		rcxMain.config.popupcolor = localStorage["popupcolor"];
	}

	if (!rcxMain.config.popupcolor) {
		rcxMain.config.popupcolor = "blue"
	}

	/** Set popupDelay option value */
	if (items.popupDelay) {
		rcxMain.config.popupDelay = items.popupDelay;
	}

	if (localStorage["popupDelay"]) {
		rcxMain.config.popupDelay = localStorage["popupDelay"];
	}

	if (!rcxMain.config.popupDelay) {
		rcxMain.config.popupDelay = "150"
	}

	/** Set popupLocation option value */
	if (items.popupLocation) {
		rcxMain.config.popupLocation = items.popupLocation;
	}

	if (localStorage["popupLocation"]) {
		rcxMain.config.popupLocation = localStorage["popupLocation"];
	}

	//Todo: Confirm popUpLocation default value
	if (!rcxMain.config.popupLocation) {
		rcxMain.config.popupLocation = "1"
	}

	/** Set showOnKey option value */
	if (items.showOnKey) {
		rcxMain.config.showOnKey = items.showOnKey;
	}

	if (localStorage["showOnKey"]) {
		rcxMain.config.showOnKey = localStorage["showOnKey"];
	}

	if (!rcxMain.config.showOnKey) {
		rcxMain.config.showOnKey = ""
	}

	/** Set textboxhl option value */
	if (items.textboxhl) {
		rcxMain.config.textboxhl = items.textboxhl;
	}

	if (localStorage["textboxhl"]) {
		rcxMain.config.textboxhl = localStorage["textboxhl"];
	}

	if (!rcxMain.config.textboxhl) {
		rcxMain.config.textboxhl = false
	}
}

