/*

  Rikai champ
  by Brian Birtles
  https://github.com/birtles/rikaichamp

  ---

  Originally based on Rikaikun
  by Erek Speed
  http://code.google.com/p/rikaikun/

  ---

  Originally based on Rikaichan 1.07
  by Jonathan Zarate
  http://www.polarcloud.com/

  ---

  Originally based on RikaiXUL 0.4 by Todd Rudick
  http://www.rikai.com/
  http://rikaixul.mozdev.org/

  ---

  This program is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation; either version 2 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

  ---

  Please do not change or remove any of the copyrights or links to web pages
  when modifying any of the files. - Jon

*/

var rcxContent = {
  dictCount: 3,
  altView: 0,

  sameDict: 0,
  forceKanji: 0,
  defaultDict: 2,
  nextDict: 3,

  // Adds the listeners and stuff.
  enableTab: function() {
    if (!window.rikaichamp) {
      window.rikaichamp = {};
      window.addEventListener('mousemove', this.onMouseMove, false);
      window.addEventListener('keydown', this.onKeyDown, true);
      window.addEventListener('keyup', this.onKeyUp, true);
      window.addEventListener('mousedown', this.onMouseDown, false);
      window.addEventListener('mouseup', this.onMouseUp, false);
    }
  },

  // Removes the listeners and stuff
  disableTab: function() {
    if (window.rikaichamp) {
      var e;
      window.removeEventListener('mousemove', this.onMouseMove, false);
      window.removeEventListener('keydown', this.onKeyDown, true);
      window.removeEventListener('keyup', this.onKeyUp, true);
      window.removeEventListener('mousedown', this.onMouseDown, false);
      window.removeEventListener('mouseup', this.onMouseUp, false);

      e = document.getElementById('rikaichamp-css');
      if (e) e.parentNode.removeChild(e);
      e = document.getElementById('rikaichamp-window');
      if (e) e.parentNode.removeChild(e);

      this.clearHi();
      delete window.rikaichamp;
    }
  },

  getContentType: function(tDoc) {
    var m = tDoc.getElementsByTagName('meta');
    for (var i in m) {
      if (m[i].httpEquiv && m[i].httpEquiv === 'Content-Type') {
        var con = m[i].content;
        con = con.split(';');
        return con[0];
      }
    }
    return null;
  },

  showPopup: function(text, elem, x, y, looseWidth) {
    const topdoc = window.document;

    if (isNaN(x) || isNaN(y)) x = y = 0;

    var popup = topdoc.getElementById('rikaichamp-window');
    if (!popup) {
      var css = topdoc.createElementNS('http://www.w3.org/1999/xhtml', 'link');
      css.setAttribute('rel', 'stylesheet');
      css.setAttribute('type', 'text/css');
      var cssdoc = window.rikaichamp.config.css;
      css.setAttribute(
        'href',
        browser.extension.getURL('css/popup-' + cssdoc + '.css')
      );
      css.setAttribute('id', 'rikaichamp-css');
      topdoc.getElementsByTagName('head')[0].appendChild(css);

      popup = topdoc.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      popup.setAttribute('id', 'rikaichamp-window');
      topdoc.documentElement.appendChild(popup);

      popup.addEventListener(
        'dblclick',
        function(ev) {
          rcxContent.hidePopup();
          ev.stopPropagation();
        },
        true
      );
    }

    popup.style.width = 'auto';
    popup.style.height = 'auto';
    popup.style.maxWidth = looseWidth ? '' : '600px';

    if (rcxContent.getContentType(topdoc) == 'text/plain') {
      var df = document.createDocumentFragment();
      df.appendChild(
        document.createElementNS('http://www.w3.org/1999/xhtml', 'span')
      );
      df.firstChild.innerHTML = text;

      while (popup.firstChild) {
        popup.removeChild(popup.firstChild);
      }
      popup.appendChild(df.firstChild);
    } else {
      popup.innerHTML = text;
    }

    if (elem) {
      popup.style.top = '-1000px';
      popup.style.left = '0px';
      popup.style.display = '';

      bbo = window;
      var pW = popup.offsetWidth;
      var pH = popup.offsetHeight;

      // guess!
      if (pW <= 0) pW = 200;
      if (pH <= 0) {
        pH = 0;
        var j = 0;
        while ((j = text.indexOf('<br/>', j)) != -1) {
          j += 5;
          pH += 22;
        }
        pH += 25;
      }

      if (this.altView == 1) {
        x = window.scrollX;
        y = window.scrollY;
      } else if (this.altView == 2) {
        x = window.innerWidth - (pW + 20) + window.scrollX;
        y = window.innerHeight - (pH + 20) + window.scrollY;
      } else if (elem instanceof window.HTMLOptionElement) {
        // FIXME: This probably doesn't actually work
        // these things are always on z-top, so go sideways

        x = 0;
        y = 0;

        var p = elem;
        while (p) {
          x += p.offsetLeft;
          y += p.offsetTop;
          p = p.offsetParent;
        }
        if (elem.offsetTop > elem.parentNode.clientHeight) y -= elem.offsetTop;

        if (x + popup.offsetWidth > window.innerWidth) {
          // too much to the right, go left
          x -= popup.offsetWidth + 5;
          if (x < 0) x = 0;
        } else {
          // use SELECT's width
          x += elem.parentNode.offsetWidth + 5;
        }
      } else {
        // go left if necessary
        if (x + pW > window.innerWidth - 20) {
          x = window.innerWidth - pW - 20;
          if (x < 0) x = 0;
        }

        // below the mouse
        var v = 25;

        // under the popup title
        if (elem.title && elem.title != '') v += 20;

        // go up if necessary
        if (y + v + pH > window.innerHeight) {
          var t = y - pH - 30;
          if (t >= 0) {
            y = t;
          } else {
            // if can't go up, still go down to prevent blocking cursor
            y += v;
          }
        } else y += v;

        x += window.scrollX;
        y += window.scrollY;
      }
    } else {
      x += window.scrollX;
      y += window.scrollY;
    }

    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    popup.style.display = '';
  },

  hidePopup: function() {
    var popup = document.getElementById('rikaichamp-window');
    if (popup) {
      popup.style.display = 'none';
      popup.innerHTML = '';
    }
    this.title = null;
  },

  isVisible: function() {
    var popup = document.getElementById('rikaichamp-window');
    return popup && popup.style.display != 'none';
  },

  clearHi: function() {
    var tdata = window.rikaichamp;
    if (!tdata || !tdata.prevSelView) return;
    if (tdata.prevSelView.closed) {
      tdata.prevSelView = null;
      return;
    }

    var sel = tdata.prevSelView.getSelection();
    // If there is an empty selection or the selection was done by
    // rikaichamp then we'll clear it
    if (!sel.toString() || tdata.selText == sel.toString()) {
      // In the case of no selection we clear the oldTA
      // The reason for this is becasue if there's no selection
      // we probably clicked somewhere else and we don't want to
      // bounce back.
      if (!sel.toString()) tdata.oldTA = null;

      // clear all selections
      sel.removeAllRanges();
      //Text area stuff
      // If oldTA is still around that means we had a highlighted region
      // which we just cleared and now we're going to jump back to where we were
      // the cursor was before our lookup
      // if oldCaret is less than 0 it means we clicked outside the box and shouldn't
      // come back
      if (tdata.oldTA && tdata.oldCaret >= 0) {
        tdata.oldTA.selectionStart = tdata.oldTA.selectionEnd = tdata.oldCaret;
      }
    }
    tdata.prevSelView = null;
    tdata.kanjiChar = null;
    tdata.selText = null;
  },

  lastFound: null,

  configPage: function() {
    window.openDialog(
      'chrome://rikaichamp/content/prefs.xul',
      '',
      'chrome,centerscreen'
    );
  },

  keysDown: [],
  lastPos: { x: null, y: null },
  lastTarget: null,

  onKeyDown: function(ev) {
    rcxContent._onKeyDown(ev);
  },
  _onKeyDown: function(ev) {
    if (
      window.rikaichamp.config.showOnKey !== '' &&
      (ev.altKey || ev.ctrlKey || ev.key == 'AltGraph')
    ) {
      if (this.lastTarget !== null) {
        var myEv = {
          clientX: this.lastPos.x,
          clientY: this.lastPos.y,
          target: this.lastTarget,
          altKey: ev.altKey || ev.key == 'AltGraph',
          ctrlKey: ev.ctrlKey,
          shiftKey: ev.shiftKey,
          noDelay: true,
        };
        this.tryUpdatePopup(myEv);
      }
      return;
    }
    if (ev.shiftKey && ev.keyCode != 16) return;
    if (this.keysDown[ev.keyCode]) return;
    if (!this.isVisible()) return;
    if (window.rikaichamp.config.disablekeys == 'true' && ev.keyCode != 16)
      return;

    var i;

    switch (ev.keyCode) {
      case 16: // shift
      case 13: // enter
        this.show(ev.currentTarget.rikaichamp, this.nextDict);
        break;
      case 27: // esc
        this.hidePopup();
        this.clearHi();
        break;
      case 65: // a
        this.altView = (this.altView + 1) % 3;
        this.show(ev.currentTarget.rikaichamp, this.sameDict);
        break;
      case 67: // c
        browser.runtime.sendMessage({
          type: 'copyToClip',
          entry: rcxContent.lastFound,
        });
        break;
      case 66: // b
        var ofs = ev.currentTarget.rikaichamp.uofs;
        for (i = 50; i > 0; --i) {
          ev.currentTarget.rikaichamp.uofs = --ofs;
          if (this.show(ev.currentTarget.rikaichamp, this.defaultDict) >= 0) {
            if (ofs >= ev.currentTarget.rikaichamp.uofs) break; // ! change later
          }
        }
        break;
      case 68: // d
        browser.runtime.sendMessage({ type: 'switchOnlyReading' });
        this.show(ev.currentTarget.rikaichamp, this.sameDict);
        break;
      case 77: // m
        ev.currentTarget.rikaichamp.uofsNext = 1;
      case 78: // n
        for (i = 50; i > 0; --i) {
          ev.currentTarget.rikaichamp.uofs +=
            ev.currentTarget.rikaichamp.uofsNext;
          if (this.show(ev.currentTarget.rikaichamp, this.defaultDict) >= 0)
            break;
        }
        break;
      case 89: // y
        this.altView = 0;
        ev.currentTarget.rikaichamp.popY += 20;
        this.show(ev.currentTarget.rikaichamp, this.sameDict);
        break;
      default:
        return;
    }

    this.keysDown[ev.keyCode] = 1;

    // don't eat shift if in this mode
    if (true /*!this.cfg.nopopkeys*/) {
      ev.preventDefault();
    }
  },

  mDown: false,

  onMouseDown: function(ev) {
    rcxContent._onMouseDown(ev);
  },
  _onMouseDown: function(ev) {
    if (ev.button != 0) {
      return;
    }
    if (this.isVisible()) {
      this.clearHi();
    }
    mDown = true;

    // If we click outside of a text box then we set
    // oldCaret to -1 as an indicator not to restore position
    // Otherwise, we switch our saved textarea to whereever
    // we just clicked
    if (!('form' in ev.target)) {
      window.rikaichamp.oldCaret = -1;
    } else {
      window.rikaichamp.oldTA = ev.target;
    }
  },

  onMouseUp: function(ev) {
    rcxContent._onMouseUp(ev);
  },
  _onMouseUp: function(ev) {
    if (ev.button != 0) {
      return;
    }
    mDown = false;
  },

  onKeyUp: function(ev) {
    if (rcxContent.keysDown[ev.keyCode]) rcxContent.keysDown[ev.keyCode] = 0;
  },

  unicodeInfo: function(c) {
    hex = '0123456789ABCDEF';
    u = c.charCodeAt(0);
    return (
      c +
      ' U' +
      hex[(u >>> 12) & 15] +
      hex[(u >>> 8) & 15] +
      hex[(u >>> 4) & 15] +
      hex[u & 15]
    );
  },

  kanjiN: 1,
  namesN: 2,

  inlineNames: {
    // text node
    '#text': true,

    // font style
    FONT: true,
    TT: true,
    I: true,
    B: true,
    BIG: true,
    SMALL: true,
    //deprecated
    STRIKE: true,
    S: true,
    U: true,

    // phrase
    EM: true,
    STRONG: true,
    DFN: true,
    CODE: true,
    SAMP: true,
    KBD: true,
    VAR: true,
    CITE: true,
    ABBR: true,
    ACRONYM: true,

    // special, not included IMG, OBJECT, BR, SCRIPT, MAP, BDO
    A: true,
    Q: true,
    SUB: true,
    SUP: true,
    SPAN: true,
    WBR: true,

    // ruby
    RUBY: true,
    RBC: true,
    RTC: true,
    RB: true,
    RT: true,
    RP: true,
  },
  isInline: function(node) {
    return (
      this.inlineNames.hasOwnProperty(node.nodeName) ||
      // only check styles for elements
      // comments do not have getComputedStyle method
      (document.nodeType == Node.ELEMENT_NODE &&
        (document.defaultView
          .getComputedStyle(node, null)
          .getPropertyValue('display') == 'inline' ||
          document.defaultView
            .getComputedStyle(node, null)
            .getPropertyValue('display') == 'inline-block'))
    );
  },

  // XPath expression which evaluates to text nodes
  // tells rikaichamp which text to translate
  // expression to get all text nodes that are not in (RP or RT) elements
  textNodeExpr:
    'descendant-or-self::text()[not(parent::rp) and not(ancestor::rt)]',

  // XPath expression which evaluates to a boolean. If it evaluates to true
  // then rikaichamp will not start looking for text in this text node
  // ignore text in RT elements
  startElementExpr: 'boolean(parent::rp or ancestor::rt)',

  // Gets text from a node
  // returns a string
  // node: a node
  // selEnd: the selection end object will be changed as a side effect
  // maxLength: the maximum length of returned string
  // xpathExpr: an XPath expression, which evaluates to text nodes, will be evaluated
  // relative to "node" argument
  getInlineText: function(node, selEndList, maxLength, xpathExpr) {
    var text = '';
    var endIndex;

    if (node.nodeName == '#text') {
      endIndex = Math.min(maxLength, node.data.length);
      selEndList.push({ node: node, offset: endIndex });
      return node.data.substring(0, endIndex);
    }

    var result = xpathExpr.evaluate(
      node,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null
    );

    while (text.length < maxLength && (node = result.iterateNext())) {
      endIndex = Math.min(node.data.length, maxLength - text.length);
      text += node.data.substring(0, endIndex);
      selEndList.push({ node: node, offset: endIndex });
    }

    return text;
  },

  // given a node which must not be null,
  // returns either the next sibling or next sibling of the father or
  // next sibling of the fathers father and so on or null
  getNext: function(node) {
    var nextNode;

    if ((nextNode = node.nextSibling) != null) return nextNode;
    if ((nextNode = node.parentNode) != null && this.isInline(nextNode))
      return this.getNext(nextNode);

    return null;
  },

  getTextFromRange: function(rangeParent, offset, selEndList, maxLength) {
    if (
      rangeParent.nodeName === 'TEXTAREA' ||
      rangeParent.nodeName === 'INPUT'
    ) {
      var endIndex = Math.min(rangeParent.data.length, offset + maxLength);
      return rangeParent.value.substring(offset, endIndex);
    }

    var text = '';

    var endIndex;

    var xpathExpr = rangeParent.ownerDocument.createExpression(
      this.textNodeExpr,
      null
    );

    if (
      rangeParent.ownerDocument.evaluate(
        this.startElementExpr,
        rangeParent,
        null,
        XPathResult.BOOLEAN_TYPE,
        null
      ).booleanValue
    )
      return '';

    if (rangeParent.nodeType != Node.TEXT_NODE) {
      return '';
    }

    endIndex = Math.min(rangeParent.data.length, offset + maxLength);
    text += rangeParent.data.substring(offset, endIndex);
    selEndList.push({ node: rangeParent, offset: endIndex });

    var nextNode = rangeParent;
    while (
      (nextNode = this.getNext(nextNode)) != null &&
      this.isInline(nextNode) &&
      text.length < maxLength
    )
      text += this.getInlineText(
        nextNode,
        selEndList,
        maxLength - text.length,
        xpathExpr
      );

    return text;
  },

  // Hack because SelEnd can't be sent in messages
  lastSelEnd: [],
  // Hack because ro was coming out always 0 for some reason.
  lastRo: 0,

  show: function(tdata, dictOption) {
    var rp = tdata.prevRangeNode;
    var ro = tdata.prevRangeOfs + tdata.uofs;
    var u;

    tdata.uofsNext = 1;

    if (!rp) {
      this.clearHi();
      this.hidePopup();
      return 0;
    }

    if (ro < 0 || ro >= rp.data.length) {
      this.clearHi();
      this.hidePopup();
      return 0;
    }

    // if we have '   XYZ', where whitespace is compressed, X never seems to get selected
    while ((u = rp.data.charCodeAt(ro)) == 32 || u == 9 || u == 10) {
      ++ro;
      if (ro >= rp.data.length) {
        this.clearHi();
        this.hidePopup();
        return 0;
      }
    }

    //
    if (
      isNaN(u) ||
      (u != 0x25cb &&
        (u < 0x3001 || u > 0x30ff) &&
        (u < 0x3400 || u > 0x9fff) &&
        (u < 0xf900 || u > 0xfaff) &&
        (u < 0xff10 || u > 0xff9d))
    ) {
      this.clearHi();
      this.hidePopup();
      return -2;
    }

    // selection end data
    var selEndList = [];
    var text = this.getTextFromRange(rp, ro, selEndList, 13 /*maxlength*/);

    lastSelEnd = selEndList;
    lastRo = ro;
    browser.runtime.sendMessage(
      { type: 'xsearch', text, dictOption: String(dictOption) },
      rcxContent.processEntry
    );

    return 1;
  },

  processEntry: function(e) {
    tdata = window.rikaichamp;
    ro = lastRo;
    selEndList = lastSelEnd;

    if (!e) {
      rcxContent.hidePopup();
      rcxContent.clearHi();
      return -1;
    }
    rcxContent.lastFound = [e];

    if (!e.matchLen) e.matchLen = 1;
    tdata.uofsNext = e.matchLen;
    tdata.uofs = ro - tdata.prevRangeOfs;

    rp = tdata.prevRangeNode;
    // don't try to highlight form elements
    if (
      rp &&
      ((tdata.config.highlight == 'true' &&
        !this.mDown &&
        !('form' in tdata.prevTarget)) ||
        ('form' in tdata.prevTarget && tdata.config.textboxhl == 'true'))
    ) {
      var doc = rp.ownerDocument;
      if (!doc) {
        rcxContent.clearHi();
        rcxContent.hidePopup();
        return 0;
      }
      rcxContent.highlightMatch(doc, rp, ro, e.matchLen, selEndList, tdata);
      tdata.prevSelView = doc.defaultView;
    }

    browser.runtime.sendMessage(
      { type: 'makehtml', entry: e },
      rcxContent.processHtml
    );
  },

  processHtml: function(html) {
    tdata = window.rikaichamp;
    rcxContent.showPopup(html, tdata.prevTarget, tdata.popX, tdata.popY, false);
    return 1;
  },

  highlightMatch: function(doc, rp, ro, matchLen, selEndList, tdata) {
    var sel = doc.defaultView.getSelection();

    // If selEndList is empty then we're dealing with a textarea/input situation
    if (selEndList.length === 0) {
      try {
        if (rp.nodeName == 'TEXTAREA' || rp.nodeName == 'INPUT') {
          // If there is already a selected region not caused by
          // rikaichamp, leave it alone
          if (sel.toString() && tdata.selText != sel.toString()) return;

          // If there is no selected region and the saved
          // textbox is the same as teh current one
          // then save the current cursor position
          // The second half of the condition let's us place the
          // cursor in another text box without having it jump back
          if (!sel.toString() && tdata.oldTA == rp) {
            tdata.oldCaret = rp.selectionStart;
            tdata.oldTA = rp;
          }
          rp.selectionStart = ro;
          rp.selectionEnd = matchLen + ro;

          tdata.selText = rp.value.substring(ro, matchLen + ro);
        }
      } catch (err) {
        // If there is an error it is probably caused by the input type
        // being not text.  This is the most general way to deal with
        // arbitrary types.

        // we set oldTA to null because we don't want to do weird stuf
        // with buttons
        tdata.oldTA = null;
        console.error(err.message);
      }
      return;
    }

    // Special case for leaving a text box to an outside japanese
    // Even if we're not currently in a text area we should save
    // the last one we were in.
    if (tdata.oldTA && !sel.toString() && tdata.oldCaret >= 0)
      tdata.oldCaret = tdata.oldTA.selectionStart;

    var selEnd;
    var offset = matchLen + ro;

    for (var i = 0, len = selEndList.length; i < len; i++) {
      selEnd = selEndList[i];
      if (offset <= selEnd.offset) break;
      offset -= selEnd.offset;
    }

    var range = doc.createRange();
    range.setStart(rp, ro);
    range.setEnd(selEnd.node, offset);

    if (sel.toString() && tdata.selText != sel.toString()) return;
    sel.removeAllRanges();
    sel.addRange(range);
    tdata.selText = sel.toString();
  },

  showTitle: function(tdata) {
    browser.runtime.sendMessage(
      { type: 'translate', title: tdata.title },
      rcxContent.processTitle
    );
  },

  processTitle: function(e) {
    const tdata = window.rikaichamp;

    if (!e) {
      rcxContent.hidePopup();
      return;
    }

    e.title = tdata.title
      .substr(0, e.textLen)
      .replace(/[\x00-\xff]/g, function(c) {
        return '&#' + c.charCodeAt(0) + ';';
      });
    if (tdata.title.length > e.textLen) e.title += '...';

    this.lastFound = [e];

    browser.runtime.sendMessage(
      { type: 'makehtml', entry: e },
      rcxContent.processHtml
    );
  },

  getFirstTextChild: function(node) {
    return document
      .evaluate(
        'descendant::text()[not(parent::rp) and not(ancestor::rt)]',
        node,
        null,
        XPathResult.ANY_TYPE,
        null
      )
      .iterateNext();
  },

  makeFake: function(real) {
    var fake = document.createElement('div');
    var realRect = real.getBoundingClientRect();
    fake.innerText = real.value;
    fake.style.cssText = document.defaultView.getComputedStyle(
      real,
      ''
    ).cssText;
    fake.scrollTop = real.scrollTop;
    fake.scrollLeft = real.scrollLeft;
    fake.style.position = 'absolute';
    fake.style.zIndex = 7777;
    fake.style.top = realRect.top + 'px';
    fake.style.left = realRect.left + 'px';

    return fake;
  },

  getTotalOffset: function(parent, tNode, offset) {
    var fChild = parent.firstChild;
    var realO = offset;
    if (fChild == tNode) return offset;
    do {
      var val = 0;
      if (fChild.nodeName == 'BR') {
        val = 1;
      } else {
        val = fChild.data ? fChild.data.length : 0;
      }
      realO += val;
    } while ((fChild = fChild.nextSibling) != tNode);

    return realO;
  },

  onMouseMove: function(ev) {
    rcxContent.lastPos.x = ev.clientX;
    rcxContent.lastPos.y = ev.clientY;
    rcxContent.lastTarget = ev.target;
    rcxContent.tryUpdatePopup(ev);
  },
  tryUpdatePopup: function(ev) {
    var altGraph = ev.getModifierState && ev.getModifierState('AltGraph');

    if (
      (window.rikaichamp.config.showOnKey.includes('Alt') &&
        !ev.altKey &&
        !altGraph) ||
      (window.rikaichamp.config.showOnKey.includes('Ctrl') && !ev.ctrlKey)
    ) {
      this.clearHi();
      this.hidePopup();
      return;
    }

    var fake;
    var tdata = window.rikaichamp; // per-tab data
    var position = document.caretPositionFromPoint(ev.clientX, ev.clientY);
    var rp = position.offsetNode;
    var ro = position.offset;
    // Put this in a try catch so that an exception here doesn't prevent editing
    // due to div.
    try {
      if (ev.target.nodeName === 'TEXTAREA' || ev.target.nodeName === 'INPUT') {
        fake = rcxContent.makeFake(ev.target);
        document.body.appendChild(fake);
        fake.scrollTop = ev.target.scrollTop;
        fake.scrollLeft = ev.target.scrollLeft;
      }

      if (fake) {
        // At the end of a line, don't do anything or you just get beginning of
        // next line
        if (rp.data && rp.data.length == ro) {
          document.body.removeChild(fake);
          return;
        }
        fake.style.display = 'none';
        ro = this.getTotalOffset(rp.parentNode, rp, ro);
      }

      // This is to account for bugs in caretRangeFromPoint
      // It includes the fact that it returns text nodes over non text nodes
      // and also the fact that it miss the first character of inline nodes.

      // If the range offset is equal to the node data length
      // Then we have the second case and need to correct.
      if (rp.data && ro == rp.data.length) {
        // A special exception is the WBR tag which is inline but doesn't
        // contain text.
        if (rp.nextSibling && rp.nextSibling.nodeName == 'WBR') {
          rp = rp.nextSibling.nextSibling;
          ro = 0;
          // If we're to the right of an inline character we can use the target.
          // However, if we're just in a blank spot don't do anything.
        } else if (rcxContent.isInline(ev.target)) {
          if (
            rp.parentNode !== ev.target &&
            !(fake && rp.parentNode.innerText == ev.target.value)
          ) {
            rp = ev.target.firstChild;
            ro = 0;
          }
          // Otherwise we're on the right and can take the next sibling of the
          // inline element.
        } else {
          rp = rp.parentNode.nextSibling;
          ro = 0;
        }
      }
      // The case where the before div is empty so the false spot is in the
      // parent
      // But we should be able to take the target.
      // The 1 seems random but it actually represents the preceding empty tag
      // also we don't want it to mess up with our fake div
      // Also, form elements don't seem to fall into this case either.
      if (
        !fake &&
        !('form' in ev.target) &&
        rp &&
        rp.parentNode != ev.target &&
        ro == 1
      ) {
        rp = rcxContent.getFirstTextChild(ev.target);
        ro = 0;
      } else if (!fake && (!rp || rp.parentNode != ev.target)) {
        // Otherwise, we're off in nowhere land and we should go home.
        // offset should be 0 or max in this case.
        rp = null;
        ro = -1;
      }

      // For text nodes do special stuff
      // we make rp the text area and keep the offset the same
      // we give the text area data so it can act normal
      if (fake) {
        rp = ev.target;
        rp.data = rp.value;
      }

      if (ev.target == tdata.prevTarget && this.isVisible()) {
        if (tdata.title) {
          if (fake) document.body.removeChild(fake);
          return;
        }
        if (rp == tdata.prevRangeNode && ro == tdata.prevRangeOfs) {
          if (fake) document.body.removeChild(fake);
          return;
        }
      }

      if (fake) {
        document.body.removeChild(fake);
      }
    } catch (err) {
      console.error(err.message);
      if (fake) document.body.removeChild(fake);
      return;
    }

    tdata.prevTarget = ev.target;
    tdata.prevRangeNode = rp;
    tdata.prevRangeOfs = ro;
    tdata.title = null;
    tdata.uofs = 0;
    this.uofsNext = 1;

    var delay = !!ev.noDelay ? 1 : window.rikaichamp.config.popupDelay;

    if (rp && rp.data && ro < rp.data.length) {
      this.forceKanji = ev.shiftKey ? 1 : 0;
      tdata.popX = ev.clientX;
      tdata.popY = ev.clientY;
      tdata.timer = setTimeout(
        function(rangeNode, rangeOffset) {
          if (
            !window.rikaichamp ||
            rangeNode != window.rikaichamp.prevRangeNode ||
            ro != window.rikaichamp.prevRangeOfs
          ) {
            return;
          }
          rcxContent.show(
            tdata,
            rcxContent.forceKanji
              ? rcxContent.forceKanji
              : rcxContent.defaultDict
          );
        },
        delay,
        rp,
        ro
      );
      return;
    }

    if (true /*this.cfg.title*/) {
      if (typeof ev.target.title == 'string' && ev.target.title.length) {
        tdata.title = ev.target.title;
      } else if (typeof ev.target.alt == 'string' && ev.target.alt.length) {
        tdata.title = ev.target.alt;
      }
    }

    // FF3
    if (ev.target.nodeName == 'OPTION') {
      tdata.title = ev.target.text;
    } else if (ev.target.nodeName == 'SELECT') {
      tdata.title = ev.target.options[ev.target.selectedIndex].text;
    }

    if (tdata.title) {
      tdata.popX = ev.clientX;
      tdata.popY = ev.clientY;
      tdata.timer = setTimeout(
        function(tdata, title) {
          if (!window.rikaichamp || title !== window.rikaichamp.title) {
            return;
          }
          rcxContent.showTitle(tdata);
        },
        delay,
        tdata,
        tdata.title
      );
    } else {
      // dont close just because we moved from a valid popup slightly over to
      // a place with nothing
      var dx = tdata.popX - ev.clientX;
      var dy = tdata.popY - ev.clientY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 4) {
        this.clearHi();
        this.hidePopup();
      }
    }
  },
};

// Event Listeners
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.type) {
    case 'enable':
      rcxContent.enableTab();
      window.rikaichamp.config = request.config;
      break;
    case 'disable':
      rcxContent.disableTab();
      break;
    case 'showPopup':
      // Don't show the popup on all the iframes, only the topmost window
      if (self === top) {
        rcxContent.showPopup(request.text);
      }
      break;
    default:
      console.error(`Unrecognized request ${JSON.stringify(request)}`);
      break;
  }
});

// When a page first loads, checks to see if it should enable script
browser.runtime.sendMessage({ type: 'enable?' });
