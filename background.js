var optionsList = [
	"copySeparator",
	"disablekeys",
	"highlight",
	"kanjicomponents",
	"lineEnding",
	"maxClipCopyEntries",
	"minihelp",
	"onlyreading",
	"popupcolor",
	"popupDelay",
	"textboxhl",
	"showOnKey"];

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

chrome.storage.sync.get(optionsList,
	function (items) {
		rcxMain.config = {};
		fillRcxValsFromLocalStore(items)
		saveOptionsToCloudStorage()
		//Todo: Erase after completely moving to fillRcxValsFromLocalStore
		// rcxMain.config.css = items.popupcolor;
		// rcxMain.config.highlight = items.highlight;
		// rcxMain.config.textboxhl = items.textboxhl;
		// rcxMain.config.onlyreading = items.onlyreading;
		// rcxMain.config.copySeparator = items.copySeparator;
		// rcxMain.config.maxClipCopyEntries = items.maxClipCopyEntries;
		// rcxMain.config.lineEnding = items.lineEnding;
		// rcxMain.config.minihelp = items.minihelp;
		// rcxMain.config.popupDelay = items.popupDelay;
		// rcxMain.config.disablekeys = items.disablekeys;
		// rcxMain.config.showOnKey = items.showOnKey;
		// rcxMain.config.kanjicomponents = items.kanjicomponents;
		//
		//
		// for (i = 0; i*2 < rcxDict.prototype.kanjiInfoLabelList.length; i++) {
		// 	rcxMain.config.kanjiinfo[i] = items.kanjiinfo[i*2];
		// }


		// for (i = 0; i * 2 < rcxDict.prototype.kanjiInfoLabelList.length; i++) {
		// 	initStorage(rcxDict.prototype.kanjiInfoLabelList[i * 2], "true")
		// }

		// Todo: Migrate this version logic and version history to - > fillRcxValsFromLocalStore()
		// if (initStorage("v0.8.92", true)) {
		// 	// v0.7
		// 	initStorage("popupcolor", "blue");
		// 	initStorage("highlight", true);
		//
		// 	// v0.8
		// 	// No changes to options
		//
		// 	// V0.8.5
		// 	initStorage("textboxhl", false);
		//
		// 	// v0.8.6
		// 	initStorage("onlyreading", false);
		// 	// v0.8.8
		// 	if (items.highlight == "yes")
		// 		items.highlight = "true";
		// 	if (items.highlight == "no")
		// 		items.highlight = "false";
		// 	if (items.textboxhl == "yes")
		// 		items.textboxhl = "true";
		// 	if (items.textboxhl == "no")
		// 		items.textboxhl = "false";
		// 	if (items.onlyreading == "yes")
		// 		items.onlyreading = "true";
		// 	if (items.onlyreading == "no")
		// 		items.onlyreading = "false";
		// 	initStorage("copySeparator", "tab");
		// 	initStorage("maxClipCopyEntries", "7");
		// 	initStorage("lineEnding", "n");
		// 	initStorage("minihelp", "true");
		// 	initStorage("disablekeys", "false");
		// 	initStorage("kanjicomponents", "true");
		//
		// 	// v0.8.92
		// 	initStorage("popupDelay", "150");
		// 	initStorage("showOnKey", "");
		// }

	});

/**
 * Initializes the localStorage for the given key.
 * If the given key is already initialized, nothing happens.
 *
 * @author Teo (GD API Guru)
 * @param key The key for which to initialize
 * @param initialValue Initial value of localStorage on the given key
 * @return boolean if a value is assigned or false if nothing happens
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
function fillRcxValsFromLocalStore(items) {
	/** Set Copy Separator Option value */
	if(items.copySeparator){
		rcxMain.config.copySeparator =items.copySeparator;
	}

	if(localStorage["copySeparator"]){
		rcxMain.config.copySeparator = localStorage["copySeparator"];
	}

	if(!rcxMain.config.copySeparator){
		rcxMain.config.copySeparator =  "tab"
	}


	/** Set Disable Keys option value */
	if(items.disablekeys){
		rcxMain.config.disablekeys = items.disablekeys;
	}


	if(localStorage["disablekeys"]){
		rcxMain.config.disablekeys = localStorage["disablekeys"];
	}

	if(!rcxMain.config.disablekeys)
		rcxMain.config.disablekeys = "false"
	}

	/** Set highlight option value */
	if(items.highlight){
		rcxMain.config.highlight = items.highlight;
	}

	if(localStorage["highlight"]){
		rcxMain.config.highlight = localStorage["highlight"];
	}

	if(!rcxMain.config.highlight){
		rcxMain.config.highlight = true
	}

	/** Set kanji components option value */
	if(items.kanjicomponents){
		rcxMain.config.kanjicomponents = items.kanjicomponents;
	}

	if(localStorage["kanjicomponents"]){
		rcxMain.config.kanjicomponents = localStorage["kanjicomponents"];
	}

	if(!rcxMain.config.kanjicomponents){
		rcxMain.config.kanjicomponents = "true"
	}

	/** Set lineEnding option value */
	if(items.lineEnding){
		rcxMain.config.lineEnding = items.lineEnding;
	}

	if(localStorage["lineEnding"]){
		rcxMain.config.lineEnding = localStorage["lineEnding"];
	}

	if(!rcxMain.config.lineEnding){
		rcxMain.config.lineEnding = "n"
	}

	/** Set maxClipCopyEntries option value */
	if(items.maxClipCopyEntries){
		rcxMain.config.maxClipCopyEntries = items.maxClipCopyEntries;
	}

	if(localStorage["maxClipCopyEntries"]){
		rcxMain.config.maxClipCopyEntries = localStorage["maxClipCopyEntries"];
	}

	if(!rcxMain.config.maxClipCopyEntries){
		rcxMain.config.maxClipCopyEntries = "7"
	}

	/** Set minihelp option value */
	if(items.minihelp){
		rcxMain.config.minihelp = items.minihelp;
	}

	if(localStorage["minihelp"]){
		rcxMain.config.minihelp = localStorage["minihelp"];
	}

	if(!rcxMain.config.minihelp){
		rcxMain.config.minihelp = "true"
	}

	/** Set onlyreading option value */
	if(items.onlyreading){
		rcxMain.config.onlyreading = items.onlyreading;
	}

	if(localStorage["onlyreading"]){
		rcxMain.config.onlyreading = localStorage["onlyreading"];
	}

	if(!rcxMain.config.onlyreading){
		rcxMain.config.onlyreading = false
	}

	/** Set popupcolor option value */
	if(items.popupcolor){
		rcxMain.config.popupcolor = items.popupcolor;
	}

	if(localStorage["popupcolor"]){
		rcxMain.config.popupcolor = localStorage["popupcolor"];
	}

	if(!rcxMain.config.popupcolor){
		rcxMain.config.popupcolor = "blue"
	}

	/** Set popupDelay option value */
	if(items.popupDelay){
		rcxMain.config.popupDelay = items.popupDelay;
	}

	if(localStorage["popupDelay"]){
		rcxMain.config.popupDelay = localStorage["popupDelay"];
	}

	if(!rcxMain.config.popupDelay){
		rcxMain.config.popupDelay = "150"
	}

	/** Set popupLocation option value */
	if(items.popupLocation){
		rcxMain.config.popupLocation = items.popupLocation;
	}

	if(localStorage["popupLocation"]){
		rcxMain.config.popupLocation = localStorage["popupLocation"];
	}

	//Todo: Find popuplocation default value
	// if(!rcxMain.config.popupLocation){
	// 	rcxMain.config.popupLocation = "150"
	// }

	/** Set showOnKey option value */
	if(items.showOnKey){
		rcxMain.config.showOnKey = items.showOnKey;
	}

	if(localStorage["showOnKey"]){
		rcxMain.config.showOnKey = localStorage["showOnKey"];
	}

	if(!rcxMain.config.showOnKey){
		rcxMain.config.showOnKey = ""
	}

	/** Set textboxhl option value */
	if(items.textboxhl){
		rcxMain.config.textboxhl = items.textboxhl;
	}

	if(localStorage["textboxhl"]){
		rcxMain.config.textboxhl = localStorage["textboxhl"];
	}

	if(!rcxMain.config.textboxhl){
		rcxMain.config.textboxhl = false
	}

	/** Set kanjiinfo option values */
	rcxMain.config.kanjiinfo = new Array(rcxDict.prototype.kanjiInfoLabelList.length/2);
	for (i = 0; i*2 < rcxDict.prototype.kanjiInfoLabelList.length; i++) {
		if(items.kanjiinfo[i*2]){
			rcxMain.config.kanjiinfo[i] = items.kanjiinfo[i*2];
		}

		if(localStorage[rcxDict.prototype.kanjiInfoLabelList[i*2]]) {
			rcxMain.config.kanjiinfo[i] = localStorage[rcxDict.prototype.kanjiInfoLabelList[i * 2]];
		}

		if(!rcxMain.config.kanjiinfo){
			rcxMain.config.kanjiinfo[i] = "true"
		}
	}
