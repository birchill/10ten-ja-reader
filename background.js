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
            /*			case 'nextDict':
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
var getItems = ["popupcolor", "highlight", "textboxhl", "onlyreading",
    "minihelp", "disablekeys", "kanjicomponents", "lineEnding", "copySeparator",
    "maxClipCopyEntries", "popupDelay",
    "showOnKey"];
chrome.storage.sync.get(getItems,
    function (items) {
        if (initStorage("v0.8.92", true)) {
            // v0.7
            initStorage("popupcolor", "blue");
            initStorage("highlight", true);

            // v0.8
            // No changes to options

            // V0.8.5
            initStorage("textboxhl", false);

            // v0.8.6
            initStorage("onlyreading", false);
            // v0.8.8
            if (items.highlight == "yes")
                items.highlight = "true";
            if (items.highlight == "no")
                items.highlight = "false";
            if (items.textboxhl == "yes")
                items.textboxhl = "true";
            if (items.textboxhl == "no")
                items.textboxhl = "false";
            if (items.onlyreading == "yes")
                items.onlyreading = "true";
            if (items.onlyreading == "no")
                items.onlyreading = "false";
            initStorage("copySeparator", "tab");
            initStorage("maxClipCopyEntries", "7");
            initStorage("lineEnding", "n");
            initStorage("minihelp", "true");
            initStorage("disablekeys", "false");
            initStorage("kanjicomponents", "true");

            for (i = 0; i * 2 < rcxDict.prototype.kanjiInfoLabelList.length; i++) {
                initStorage(rcxDict.prototype.kanjiInfoLabelList[i * 2], "true")
            }

            // v0.8.92
            initStorage("popupDelay", "150");
            initStorage("showOnKey", "");
        }

        /**
         * Initializes the localStorage for the given key.
         * If the given key is already initialized, nothing happens.
         *
         * @author Teo (GD API Guru)
         * @param key The key for which to initialize
         * @param initialValue Initial value of localStorage on the given key
         * @return boolean if a value is assigned or false if nothing happens
         */
        function initStorage(key, initialValue) {
            var currentValue = localStorage[key];
            if (!currentValue) {
                localStorage[key] = initialValue;
                return true;
            }
            return false;
        }

        rcxMain.config = {};
        rcxMain.config.css = items.popupcolor;
        rcxMain.config.highlight = items.highlight;
        rcxMain.config.textboxhl = items.textboxhl;
        rcxMain.config.onlyreading = items.onlyreading;
        rcxMain.config.copySeparator = items.copySeparator;
        rcxMain.config.maxClipCopyEntries = items.maxClipCopyEntries;
        rcxMain.config.lineEnding = items.lineEnding;
        rcxMain.config.minihelp = items.minihelp;
        rcxMain.config.popupDelay = items.popupDelay;
        rcxMain.config.disablekeys = items.disablekeys;
        rcxMain.config.showOnKey = items.showOnKey;
        rcxMain.config.kanjicomponents = items.kanjicomponents;
        // rcxMain.config.kanjiinfo = new Array(rcxDict.prototype.kanjiInfoLabelList.length / 2);
        // for (i = 0; i * 2 < rcxDict.prototype.kanjiInfoLabelList.length; i++) {
        //     rcxMain.config.kanjiinfo[i] = localStorage[rcxDict.prototype.kanjiInfoLabelList[i * 2]];
        // }
    })
