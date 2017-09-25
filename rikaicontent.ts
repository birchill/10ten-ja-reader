// @format
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

interface Window {
  rikaichamp: any;
}

interface ParentNode {
  append(...nodes: (Node | string)[]): void;
}

interface ChildNode {
  remove(): void;
}

interface CaretPosition {
  readonly offsetNode: Node;
  readonly offset: number;
}

interface Document {
  caretPositionFromPoint(x: number, y: number): CaretPosition | null;
}

interface NodeIterator {
  readonly referenceNode?: Node;
}

interface FakeTextNode extends Node {
  data: string;
}

// Either end of a Range object
interface RangeEndpoint {
  container: Node;
  offset: number;
}

interface GetTextResult {
  text: string;
  // Contains the node and offset where the selection starts. This will be null
  // if, for example, the result is the text from an element's title attribute.
  rangeStart?: RangeEndpoint;
  // Contains the node and offset for each the text containing node in the
  // maximum selected range.
  rangeEnds: RangeEndpoint[];
}

var rcxContent = {
  dictCount: 3,
  altView: 0,

  sameDict: 0,
  forceKanji: 0,
  defaultDict: 2,
  nextDict: 3,

  MAX_LENGTH: 13,

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

  showPopup: function(
    textOrHtml: string | DocumentFragment,
    elem?: Element,
    x?: number,
    y?: number,
    looseWidth?: boolean
  ) {
    const topdoc = window.document;

    if (isNaN(x) || isNaN(y)) x = y = 0;

    var popup = topdoc.getElementById('rikaichamp-window');
    if (!popup) {
      var css = topdoc.createElement('link');
      css.setAttribute('rel', 'stylesheet');
      css.setAttribute('type', 'text/css');
      var cssdoc = window.rikaichamp.config.css;
      css.setAttribute(
        'href',
        browser.extension.getURL('css/popup-' + cssdoc + '.css')
      );
      css.setAttribute('id', 'rikaichamp-css');
      topdoc.getElementsByTagName('head')[0].appendChild(css);

      popup = topdoc.createElement('div');
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

    if (rcxContent.getContentType(topdoc) === 'text/plain') {
      var df = document.createDocumentFragment();
      df.appendChild(document.createElement('span'));
      if (typeof textOrHtml === 'string') {
        df.firstElementChild.innerHTML = textOrHtml;
      } else {
        df.firstElementChild.append(textOrHtml);
      }

      while (popup.firstChild) {
        (<Element | CharacterData>popup.firstChild).remove();
      }
      popup.append(df.firstElementChild);
    } else {
      if (typeof textOrHtml === 'string') {
        popup.innerHTML = textOrHtml;
      } else {
        while (popup.firstChild) {
          (<Element | CharacterData>popup.firstChild).remove();
        }
        popup.append(textOrHtml);
      }
    }

    // TODO: Make all this work with SVG elements too
    if (elem instanceof HTMLElement) {
      popup.style.top = '-1000px';
      popup.style.left = '0px';
      popup.style.display = '';

      var pW = popup.offsetWidth;
      var pH = popup.offsetHeight;

      // guess!
      if (pW <= 0) pW = 200;
      console.assert(pH > 0, `Got ${pH} for popup height`);

      if (this.altView == 1) {
        x = window.scrollX;
        y = window.scrollY;
      } else if (this.altView == 2) {
        x = window.innerWidth - (pW + 20) + window.scrollX;
        y = window.innerHeight - (pH + 20) + window.scrollY;
      } else if (elem instanceof HTMLOptionElement) {
        // FIXME: This probably doesn't actually work
        // these things are always on z-top, so go sideways

        x = 0;
        y = 0;

        let p: HTMLElement = elem;
        while (p) {
          x += p.offsetLeft;
          y += p.offsetTop;
          p = p.offsetParent as HTMLElement;
        }
        if (elem.offsetTop > (<HTMLElement>elem.parentNode).clientHeight) {
          y -= elem.offsetTop;
        }

        if (x + popup.offsetWidth > window.innerWidth) {
          // too much to the right, go left
          x -= popup.offsetWidth + 5;
          if (x < 0) x = 0;
        } else {
          // use SELECT's width
          x += (<HTMLElement>elem.parentNode).offsetWidth + 5;
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
    window.open(
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
    this.mDown = true;

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
    this.mDown = false;
  },

  onKeyUp: function(ev) {
    if (rcxContent.keysDown[ev.keyCode]) rcxContent.keysDown[ev.keyCode] = 0;
  },

  unicodeInfo: function(c) {
    const hex = '0123456789ABCDEF';
    const u = c.charCodeAt(0);
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
      const endIndex = Math.min(rangeParent.data.length, offset + maxLength);
      return rangeParent.value.substring(offset, endIndex);
    }

    var text = '';

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

    const endIndex = Math.min(rangeParent.data.length, offset + maxLength);
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

    this.lastSelEnd = selEndList;
    this.lastRo = ro;
    browser.runtime
      .sendMessage({ type: 'xsearch', text, dictOption: String(dictOption) })
      .then(rcxContent.processEntry);

    return 1;
  },

  processEntry: function(e) {
    const tdata = window.rikaichamp;
    const ro = rcxContent.lastRo;
    const selEndList = rcxContent.lastSelEnd;

    if (!e) {
      rcxContent.hidePopup();
      rcxContent.clearHi();
      return -1;
    }
    rcxContent.lastFound = [e];

    if (!e.matchLen) e.matchLen = 1;
    tdata.uofsNext = e.matchLen;
    tdata.uofs = ro - tdata.prevRangeOfs;

    const rp = tdata.prevRangeNode;
    // don't try to highlight form elements
    if (
      rp &&
      ((tdata.config.highlight == 'true' &&
        !rcxContent.mDown &&
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

    if (e.kanji) {
      rcxContent.processHtml(rcxContent.makeHtmlForEntry(e));
    } else {
      browser.runtime
        .sendMessage({ type: 'makehtml', entry: e })
        .then(rcxContent.processHtml);
    }
  },

  processHtml: function(html) {
    const tdata = window.rikaichamp;
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
    // XXX This sometimes errors with:
    // IndexSizeError: Index or size is negative or greater than the allowed
    // amount
    range.setStart(rp, ro);
    range.setEnd(selEnd.node, offset);

    if (sel.toString() && tdata.selText != sel.toString()) return;
    sel.removeAllRanges();
    sel.addRange(range);
    tdata.selText = sel.toString();
  },

  showTitle: function(tdata) {
    browser.runtime
      .sendMessage({ type: 'translate', title: tdata.title })
      .then(rcxContent.processTitle);
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

    if (e.kanji) {
      rcxContent.processHtml(rcxContent.makeHtmlForEntry(e));
    } else {
      browser.runtime
        .sendMessage({ type: 'makehtml', entry: e })
        .then(rcxContent.processHtml);
    }
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
    fake.style.zIndex = '7777';
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

  onMouseMove: function(ev: MouseEvent) {
    rcxContent.lastPos.x = ev.clientX;
    rcxContent.lastPos.y = ev.clientY;
    rcxContent.lastTarget = ev.target;
    rcxContent.tryUpdatePopup(ev);
  },

  tryUpdatePopup: function(ev) {
    if (
      (window.rikaichamp.config.showOnKey.includes('Alt') &&
        !ev.altKey &&
        !ev.getModifierState('AltGraph')) ||
      (window.rikaichamp.config.showOnKey.includes('Ctrl') && !ev.ctrlKey)
    ) {
      this.clearHi();
      this.hidePopup();
      return;
    }

    // TODO: I'm currently in the process of completely rewriting this.
    // As far as I can tell there are three things we need to do:
    // (1) Find the text string under the cursor for looking up
    // (2) Highlighting the longest matched substring
    // (3) Positioning the popup so that it fits on the screen and doesn't
    //     overlap the highlighted text.
    const textAtPoint = this.getTextAtPoint(
      {
        x: ev.clientX,
        y: ev.clientY,
      },
      this.MAX_LENGTH
    );
    if (textAtPoint) {
      console.log(`Got '${textAtPoint.text}'`);
    }

    var fake;
    var tdata = window.rikaichamp; // per-tab data
    var position = document.caretPositionFromPoint(ev.clientX, ev.clientY);
    var rp = position ? position.offsetNode : null;
    var ro = position ? position.offset : null;

    function isTextNode(node: Node): node is CharacterData | FakeTextNode {
      return node && (<CharacterData>node).data !== undefined;
    }

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
        if (isTextNode(rp) && rp.data.length === ro) {
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
      if (isTextNode(rp) && ro === rp.data.length) {
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
            !(
              fake && (<HTMLElement>rp.parentNode).innerText === ev.target.value
            )
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
        (<FakeTextNode>rp).data = (<
          | HTMLTextAreaElement
          | HTMLInputElement>rp).value;
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

    if (isTextNode(rp) && ro < rp.data.length) {
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

    if (typeof ev.target.title == 'string' && ev.target.title.length) {
      tdata.title = ev.target.title;
    } else if (typeof ev.target.alt == 'string' && ev.target.alt.length) {
      tdata.title = ev.target.alt;
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

  currentCaretPosition: null,
  currentTextAtPoint: null,

  getTextAtPoint: function(
    point: {
      x: number;
      y: number;
    },
    maxLength?: number
  ): GetTextResult | null {
    const position: CaretPosition = document.caretPositionFromPoint(
      point.x,
      point.y
    );

    // TODO: Special handling for text area and input?
    // (Is this only needed for highlighting?)

    if (
      position &&
      this.currentCaretPosition &&
      position.offsetNode === this.currentCaretPosition.offsetNode &&
      position.offset === this.currentCaretPosition.offset
    ) {
      return this.currentTextAtPoint;
    }

    this.currentCaretPosition = position;

    function isTextNode(node: Node): node is CharacterData {
      return node && node.nodeType === Node.TEXT_NODE;
    }

    if (position && isTextNode(position.offsetNode)) {
      const isRubyAnnotationElement = (element: Element) => {
        const tag = element.tagName.toLowerCase();
        return tag === 'rp' || tag === 'rt';
      };

      // Get the ancestor node for all inline nodes
      let inlineAncestor = position.offsetNode.parentElement;
      let display = getComputedStyle(inlineAncestor).display;
      while (
        (display === 'inline' || display === 'ruby') &&
        !isRubyAnnotationElement(inlineAncestor) &&
        inlineAncestor.parentElement
      ) {
        inlineAncestor = inlineAncestor.parentElement;
        display = getComputedStyle(inlineAncestor).display;
      }

      // Skip ruby annotation elements when traversing. However, don't do that
      // if the inline ancestor is itself a ruby annotation element or else
      // we'll never be able to find the starting point within the tree walker.
      let filter;
      if (!isRubyAnnotationElement(inlineAncestor)) {
        filter = {
          acceptNode: node =>
            isRubyAnnotationElement(node.parentElement)
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_ACCEPT,
        };
      }

      // Setup a treewalker starting at the current node
      const treeWalker = document.createNodeIterator(
        inlineAncestor,
        NodeFilter.SHOW_TEXT,
        filter
      );
      while (treeWalker.referenceNode !== position.offsetNode &&
             treeWalker.nextNode());

      if (treeWalker.referenceNode !== position.offsetNode) {
        console.error('Could not find node in tree');
        console.log(position.offsetNode);
        return null;
      }

      // Look for start, skipping any initial whitespace
      let node: CharacterData = position.offsetNode;
      let offset: number = position.offset;
      do {
        const nodeText = node.data.substr(offset);
        const textStart = nodeText.search(/\S/);
        if (textStart !== -1) {
          offset += textStart;
          break;
        }
        node = <CharacterData>treeWalker.nextNode();
        offset = 0;
      } while (node);
      // (This should probably not traverse block siblings but oh well)

      if (!node) {
        return null;
      }

      let result = {
        text: '',
        rangeStart: {
          container: node,
          offset: offset,
        },
        rangeEnds: [],
      };

      // Look for range ends
      do {
        // Search for non-Japanese text (or a delimiter of some sort even if it
        // is "Japanese" in the sense of being full-width).
        //
        // * U+25CB is 'white circle' often used to represent a blank
        //   (U+3007 is an ideographic zero that is also sometimes used for this
        //   purpose, but this is included in the U+3001~U+30FF range.)
        // * U+3000~U+30FF is ideographic punctuation but we skip U+3000
        //   (ideographic space), U+3001 (、 ideographic comma), U+3002
        //   (。 ideographic full stop), and U+3003 (〃 ditto mark) since these
        //   are typically only going to delimit words.
        // * U+3041~U+309F is the hiragana range
        // * U+30A0~U+30FF is the katakana range
        // * U+3400~U+4DBF is the CJK Unified Ideographs Extension A block (rare
        //   kanji)
        // * U+4E00~U+9FFF is the CJK Unified Ideographs block ("the kanji")
        // * U+F900~U+FAFF is the CJK Compatibility Ideographs block (random odd
        //   kanji, because standards)
        // * U+FF61~U+FF65 is some halfwidth ideographic symbols, e.g. ｡ but we
        //   skip them (although previus rikai-tachi included them) since
        //   they're mostly going to be delimiters
        // * U+FF66~U+FF9F is halfwidth katakana
        //
        const nonJapaneseOrDelimiter = /[^\u25cb\u3004-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;

        const nodeText = node.data.substr(offset);
        let textEnd = nodeText.search(nonJapaneseOrDelimiter);

        if (typeof maxLength === 'number' && maxLength >= 0) {
          const maxEnd = maxLength - result.text.length;
          if (textEnd === -1) {
            // The >= here is important since it means that if the node has
            // exactly enough characters to reach the maxLength then we will
            // stop walking the tree at this point.
            textEnd = node.data.length - offset >= maxEnd ? maxEnd : -1;
          } else {
            textEnd = Math.min(textEnd, maxEnd);
          }
        }

        if (textEnd === 0) {
          // There are no characters here for us.
          break;
        } else if (textEnd !== -1) {
          // The text node has disallowed characters mid-way through. Return up
          // to that point or maxLength, whichever comes first.
          result.text += nodeText.substr(0, textEnd);
          result.rangeEnds.push({ container: node, offset: offset + textEnd });
          break;
        }

        // The whole text node is allowed characters, keep going.
        result.text += nodeText;
        result.rangeEnds.push({ container: node, offset: node.data.length });
        node = <CharacterData>treeWalker.nextNode();
        display = node ? getComputedStyle(node.parentElement).display : '';
        offset = 0;
      } while (
        node &&
        (node.parentElement === inlineAncestor ||
          display === 'inline' ||
          display === 'ruby')
      );

      // Check if we didn't find any suitable characters
      if (!result.rangeEnds.length) {
        result = null;
      }

      this.currentTextAtPoint = result;

      return result;
    }

    this.currentTextAtPoint = null;
    return null;

    // Otherwise, see if the target has a 'title' attribute we can look up
    // (We'll need the target element to be passed in for this? Or should we
    // just call getElementAtPoint? And walk up the chain until we find one
    // with a title?)
    // Also, for each element, look for an 'alt' attribute,
    // or the text of an <option> (needed?), or the selected
    // text of a select
    // --- in this case we'll need to return some flag indicating
    //     that the text was not something you can normally select
    //     so that we know to translate everything in range
    //     and not just the bit under the cursor

    // If none of that works but the position is not far from the
    // the last time we got called, then just return currText
    // (and that last value of said flag)

    // Factor in the manual offset from the "next word" feature?
    // Or would returning the text here be enough?

    // TODO: If we're in <input> or <textarea>, just read out the
    // text up to maxLength
  },

  makeHtmlForEntry: function(entry) {
    if (!entry) {
      return null;
    }

    if (entry.kanji) {
      return this.makeHtmlForKanji(entry);
    }

    return null;
  },

  makeHtmlForKanji: function(entry) {
    // (This is all just temporary. Long term we need to either use some sort of
    // templating system, or, if we can tidy up the markup enough by using more
    // modern CSS instead of relying on <br> elements etc., we might be able to
    // continue using the DOM API directly.)
    const result = document.createDocumentFragment();

    // Containing table
    const table = document.createElement('table');
    table.classList.add('k-main-tb');
    result.append(table);

    // Top row
    const topRow = document.createElement('tr');
    table.append(topRow);
    const topCell = document.createElement('td');
    topRow.append(topCell);
    topCell.setAttribute('valign', 'top');

    // Summary information
    const summaryTable = document.createElement('table');
    topCell.append(summaryTable);
    summaryTable.classList.add('k-abox-tb');

    const summaryFirstRow = document.createElement('tr');
    summaryTable.append(summaryFirstRow);

    const radicalCell = document.createElement('td');
    summaryFirstRow.append(radicalCell);
    radicalCell.classList.add('k-abox-r');
    radicalCell.append('radical');
    radicalCell.append(document.createElement('br'));
    radicalCell.append(`${entry.radical} ${entry.misc.B}`);

    // Kanji components
    if (entry.components) {
      const componentsTable = document.createElement('table');
      componentsTable.classList.add('k-bbox-tb');
      topCell.append(componentsTable);

      entry.components.forEach((component, index) => {
        const row = document.createElement('tr');
        componentsTable.append(row);

        const radicalCell = document.createElement('td');
        row.append(radicalCell);
        radicalCell.classList.add(`k-bbox-${(index + 1) % 2}a`);
        radicalCell.append(component.radical);

        const readingCell = document.createElement('td');
        row.append(readingCell);
        readingCell.classList.add(`k-bbox-${(index + 1) % 2}b`);
        readingCell.append(component.yomi);

        const englishCell = document.createElement('td');
        row.append(englishCell);
        englishCell.classList.add(`k-bbox-${(index + 1) % 2}b`);
        englishCell.append(component.english);
      });
    }

    const gradeCell = document.createElement('td');
    summaryFirstRow.append(gradeCell);
    gradeCell.classList.add('k-abox-g');
    let grade = document.createDocumentFragment();
    switch (entry.misc.G) {
      case 8:
        grade.append('general');
        grade.append(document.createElement('br'));
        grade.append('use');
        break;
      case 9:
        grade.append('name');
        grade.append(document.createElement('br'));
        grade.append('use');
        break;
      default:
        if (isNaN(entry.misc.G)) {
          grade.append('-');
        } else {
          grade.append('grade');
          grade.append(document.createElement('br'));
          grade.append(entry.misc.G);
        }
        break;
    }
    gradeCell.append(grade);

    const summarySecondRow = document.createElement('tr');
    summaryTable.append(summarySecondRow);

    const frequencyCell = document.createElement('td');
    summarySecondRow.append(frequencyCell);
    frequencyCell.classList.add('k-abox-f');
    frequencyCell.append('freq');
    frequencyCell.append(document.createElement('br'));
    frequencyCell.append(entry.misc.F || '-');

    const strokesCell = document.createElement('td');
    summarySecondRow.append(strokesCell);
    strokesCell.classList.add('k-abox-s');
    strokesCell.append('strokes');
    strokesCell.append(document.createElement('br'));
    strokesCell.append(entry.misc.S);

    // The kanji itself
    const kanjiSpan = document.createElement('span');
    kanjiSpan.classList.add('k-kanji');
    kanjiSpan.append(entry.kanji);
    topCell.append(kanjiSpan);
    topCell.append(document.createElement('br'));

    // English
    const englishDiv = document.createElement('div');
    englishDiv.classList.add('k-eigo');
    englishDiv.append(entry.eigo);
    topCell.append(englishDiv);

    // Readings
    const yomiDiv = document.createElement('div');
    yomiDiv.classList.add('k-yomi');
    topCell.append(yomiDiv);

    // Readings come in the form:
    //
    //  ヨ、 あた.える、 あずか.る、 くみ.する、 ともに
    //
    // We want to take the bit after the '.' and wrap it in a span with an
    // appropriate class.
    entry.onkun.forEach((reading, index) => {
      if (index !== 0) {
        yomiDiv.append('\u3001');
      }
      const highlightIndex = reading.indexOf('.');
      if (highlightIndex === -1) {
        yomiDiv.append(reading);
      } else {
        yomiDiv.append(reading.substr(0, highlightIndex));
        const highlightSpan = document.createElement('span');
        highlightSpan.classList.add('k-yomi-hi');
        highlightSpan.append(reading.substr(highlightIndex + 1));
        yomiDiv.append(highlightSpan);
      }
    });

    // Optional readings
    if (entry.nanori.length) {
      const nanoriLabelSpan = document.createElement('span');
      nanoriLabelSpan.classList.add('k-yomi-ti');
      nanoriLabelSpan.append('名乗り');
      yomiDiv.append(
        document.createElement('br'),
        nanoriLabelSpan,
        ` ${entry.nanori.join('\u3001')}`
      );
    }

    if (entry.bushumei.length) {
      const bushumeiLabelSpan = document.createElement('span');
      bushumeiLabelSpan.classList.add('k-yomi-ti');
      bushumeiLabelSpan.append('部首名');
      yomiDiv.append(
        document.createElement('br'),
        bushumeiLabelSpan,
        ` ${entry.bushumei.join('\u3001')}`
      );
    }

    // Reference row
    const referenceRow = document.createElement('tr');
    table.append(referenceRow);
    const referenceCell = document.createElement('td');
    referenceRow.append(referenceCell);
    const referenceTable = document.createElement('table');
    referenceTable.classList.add('k-mix-tb');
    referenceCell.append(referenceTable);

    let toggle = 0;
    for (let ref of entry.miscDisplay) {
      const value = entry.misc[ref.abbrev] || '-';

      const row = document.createElement('tr');
      referenceTable.append(row);

      const className = `k-mix-td${(toggle ^= 1)}`;

      const nameCell = document.createElement('td');
      nameCell.classList.add(className);
      nameCell.append(ref.name);
      row.append(nameCell);

      const valueCell = document.createElement('td');
      valueCell.classList.add(className);
      valueCell.append(value);
      row.append(valueCell);
    }

    return result;
  },
};

// Event Listeners
browser.runtime.onMessage.addListener(function(request) {
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
  return false;
});

// When a page first loads, checks to see if it should enable script
browser.runtime.sendMessage({ type: 'enable?' });
