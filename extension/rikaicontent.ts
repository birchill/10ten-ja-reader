/*

  Rikaikun
  Copyright (C) 2010 Erek Speed
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

import { Config } from './configuration';
import { DictEntryData } from './data';

declare global {
  interface Window {
    rikaichan?: Rikaichan;
  }
}
type Rikaichan = {
  config?: Config;
  prevTarget?: HTMLElement;
  popX?: number;
  popY?: number;
  prevSelView?: Window;
  selText?: string;
  oldTA?: HTMLTextAreaElement | HTMLInputElement;
  oldCaret?: number;
  uofs?: number;
  uofsNext?: number;
  prevRangeNode?: CharacterData;
  prevRangeOfs?: number;
  title?: string;
  timer?: number;
};

class RcxContent {
  private dictCount = 3;
  private altView = 0;

  private sameDict = 0;
  private forceKanji = 0;
  private defaultDict = 2;
  private nextDict = 3;

  // Adds the listeners and stuff.
  enableTab(config: Config) {
    if (window.rikaichan === undefined) {
      window.rikaichan = {};
      window.addEventListener('mousemove', this.onMouseMove, false);
      window.addEventListener('keydown', this.onKeyDown, true);
      window.addEventListener('keyup', this.onKeyUp, true);
      window.addEventListener('mousedown', this.onMouseDown, false);
      window.addEventListener('mouseup', this.onMouseUp, false);
    }
    window.rikaichan.config = config;
    this.altView = config.popupLocation;
  }

  // Removes the listeners and stuff
  disableTab() {
    if (window.rikaichan !== undefined) {
      let e;
      window.removeEventListener('mousemove', this.onMouseMove, false);
      window.removeEventListener('keydown', this.onKeyDown, true);
      window.removeEventListener('keyup', this.onKeyUp, true);
      window.removeEventListener('mousedown', this.onMouseDown, false);
      window.removeEventListener('mouseup', this.onMouseUp, false);

      e = document.getElementById('rikaichan-css');
      if (e?.parentNode) {
        e.parentNode.removeChild(e);
      }
      e = document.getElementById('rikaichan-window');
      if (e?.parentNode) {
        e.parentNode.removeChild(e);
      }

      this.clearHi();
      delete window.rikaichan;
    }
  }

  getContentType(tDoc: Document) {
    const m = tDoc.getElementsByTagName('meta');
    for (const i in m) {
      if (m[i].httpEquiv === 'Content-Type') {
        const con = m[i].content.split(';');
        return con[0];
      }
    }
    return null;
  }

  showPopup(
    text: string,
    elem?: HTMLElement,
    x = 0,
    y = 0,
    looseWidth?: boolean
  ) {
    const topdoc = window.document;

    if (isNaN(x) || isNaN(y)) {
      x = y = 0;
    }

    let popup = topdoc.getElementById('rikaichan-window');
    if (!popup) {
      const css = topdoc.createElementNS(
        'http://www.w3.org/1999/xhtml',
        'link'
      );
      css.setAttribute('rel', 'stylesheet');
      css.setAttribute('type', 'text/css');
      const color = window.rikaichan!.config!.popupcolor;
      css.setAttribute(
        'href',
        chrome.extension.getURL('css/popup-' + color + '.css')
      );
      css.setAttribute('id', 'rikaichan-css');
      topdoc.getElementsByTagName('head')[0].appendChild(css);

      popup = topdoc.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      popup.setAttribute('id', 'rikaichan-window');
      popup.setAttribute('lang', 'ja');
      topdoc.documentElement.appendChild(popup);

      popup.addEventListener(
        'dblclick',
        (ev: Event) => {
          this.hidePopup();
          ev.stopPropagation();
        },
        true
      );
    }

    popup.style.width = 'auto';
    popup.style.height = 'auto';
    popup.style.maxWidth = looseWidth ? '' : '600px';

    if (this.getContentType(topdoc) === 'text/plain') {
      const docFragment = document.createDocumentFragment();
      docFragment.appendChild(
        document.createElementNS('http://www.w3.org/1999/xhtml', 'span')
      );
      (docFragment.firstChild! as HTMLElement).innerHTML = text;

      while (popup.firstChild) {
        popup.removeChild(popup.firstChild);
      }
      popup.appendChild(docFragment.firstChild!);
    } else {
      popup.innerHTML = text;
    }

    if (elem) {
      popup.style.top = '-1000px';
      popup.style.left = '0px';
      popup.style.display = '';

      let pW = popup.offsetWidth;
      let pH = popup.offsetHeight;

      // guess!
      if (pW <= 0) {
        pW = 200;
      }
      if (pH <= 0) {
        pH = 0;
        let j = 0;
        while ((j = text.indexOf('<br/>', j)) !== -1) {
          j += 5;
          pH += 22;
        }
        pH += 25;
      }

      if (this.altView === 1) {
        x = window.scrollX;
        y = window.scrollY;
      } else if (this.altView === 2) {
        x = window.innerWidth - (pW + 20) + window.scrollX;
        y = window.innerHeight - (pH + 20) + window.scrollY;
      }
      // FIXME: This probably doesn't actually work
      else if (elem instanceof window.HTMLOptionElement) {
        // these things are always on z-top, so go sideways

        x = 0;
        y = 0;

        let p = elem as HTMLElement;
        while (p) {
          x += p.offsetLeft;
          y += p.offsetTop;
          p = p.offsetParent! as HTMLElement;
        }
        if (elem.offsetTop > (elem.parentNode! as HTMLElement).clientHeight) {
          y -= elem.offsetTop;
        }

        if (x + popup.offsetWidth > window.innerWidth) {
          // too much to the right, go left
          x -= popup.offsetWidth + 5;
          if (x < 0) {
            x = 0;
          }
        } else {
          // use SELECT's width
          x += (elem.parentNode! as HTMLElement).offsetWidth + 5;
        }
      } else {
        // go left if necessary
        if (x + pW > window.innerWidth - 20) {
          x = window.innerWidth - pW - 20;
          if (x < 0) {
            x = 0;
          }
        }

        // below the mouse
        let v = 25;

        // under the popup title
        if (elem.title && elem.title !== '') {
          v += 20;
        }

        // go up if necessary
        if (y + v + pH > window.innerHeight) {
          const t = y - pH - 30;
          if (t >= 0) {
            y = t;
          } else {
            // if can't go up, still go down to prevent blocking cursor
            y += v;
          }
        } else {
          y += v;
        }

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
  }

  hidePopup() {
    const popup = document.getElementById('rikaichan-window');
    if (popup) {
      popup.style.display = 'none';
      popup.innerHTML = '';
    }
  }

  isVisible() {
    const popup = document.getElementById('rikaichan-window');
    return popup && popup.style.display !== 'none';
  }

  clearHi() {
    const tdata = window.rikaichan;
    if (!tdata || !tdata.prevSelView) {
      return;
    }
    if (tdata.prevSelView.closed) {
      tdata.prevSelView = undefined;
      return;
    }

    const sel = tdata.prevSelView.getSelection()!;
    // If there is an empty selection or the selection was done by
    // rikaikun then we'll clear it
    if (!sel.toString() || tdata.selText === sel.toString()) {
      // In the case of no selection we clear the oldTA
      // The reason for this is becasue if there's no selection
      // we probably clicked somewhere else and we don't want to
      // bounce back.
      if (!sel.toString()) {
        tdata.oldTA = undefined;
      }

      // clear all selections
      sel.removeAllRanges();
      // Text area stuff
      // If oldTA is still around that means we had a highlighted region
      // which we just cleared and now we're going to jump back to where we were
      // the cursor was before our lookup
      // if oldCaret is less than 0 it means we clicked outside the box and shouldn't
      // come back
      if (tdata.oldTA && tdata.oldCaret! >= 0) {
        tdata.oldTA.selectionStart = tdata.oldTA.selectionEnd = tdata.oldCaret!;
      }
    }
    tdata.prevSelView = undefined;
    tdata.selText = undefined;
  }

  // Array used for storing the last popup content shown, useful for easily
  // operating on the value after rendering (for copying for example).
  lastFound = [] as DictEntryData[];

  keysDown: number[] = [];
  lastPos: { x: number | null; y: number | null } = { x: null, y: null };
  lastTarget: EventTarget | null = null;

  onKeyDown = (ev: KeyboardEvent) => {
    this._onKeyDown(ev);
  };
  _onKeyDown(ev: KeyboardEvent) {
    if (
      window.rikaichan!.config!.showOnKey !== '' &&
      (ev.altKey || ev.ctrlKey || ev.key === 'AltGraph')
    ) {
      if (this.lastTarget !== null) {
        const myEv = {
          clientX: this.lastPos.x,
          clientY: this.lastPos.y,
          target: this.lastTarget,
          altKey: ev.altKey || ev.key === 'AltGraph',
          ctrlKey: ev.ctrlKey,
          shiftKey: ev.shiftKey,
          // TODO(melink14): noDelay is not event related; try to pass it in a way
          // other than adding as an unknown property to event.
          noDelay: true,
        };
        this.tryUpdatePopup(
          myEv as unknown as MouseEvent & { noDelay?: boolean }
        );
      }
      return;
    }
    if (ev.shiftKey && ev.keyCode !== 16) {
      return;
    }
    if (this.keysDown[ev.keyCode]) {
      return;
    }
    if (!this.isVisible()) {
      return;
    }
    if (window.rikaichan!.config!.disablekeys && ev.keyCode !== 16) {
      return;
    }

    let i;
    let shouldPreventDefault = true;
    const maxDictEntries = window.rikaichan!.config!.maxDictEntries;
    let e: DictEntryData | null;

    switch (ev.keyCode) {
      case 16: // shift
      case 13: // enter
        this.show((ev.currentTarget! as Window).rikaichan!, this.nextDict);
        break;
      case 74: // j
        // reverse cycle through definitions if > max (maxDictEntries)
        e = this.lastFound[0];
        if (e.data.length < maxDictEntries) {
          break;
        }
        if (!e.index) {
          e.index = 0;
        }
        if (e.index > 0) {
          e.index -= 1;
        } else {
          e.index = e.data.length - maxDictEntries;
        }

        chrome.runtime.sendMessage(
          { type: 'makehtml', entry: e },
          this.processHtml
        );
        this.lastFound = [e];
        break;
      case 75: // k
        // forward cycle through definitions if > max (maxDictEntries)
        e = this.lastFound[0];
        if (e.data.length < maxDictEntries) {
          break;
        }
        if (!e.index) {
          e.index = 0;
        }
        if (e.index >= e.data.length - maxDictEntries) {
          e.index = 0;
        } else {
          e.index += 1;
        }
        chrome.runtime.sendMessage(
          { type: 'makehtml', entry: e },
          this.processHtml
        );
        this.lastFound = [e];
        break;
      case 27: // esc
        this.hidePopup();
        this.clearHi();
        break;
      case 65: // a
        this.altView = (this.altView + 1) % 3;
        this.show((ev.currentTarget! as Window).rikaichan!, this.sameDict);
        break;
      case 67: // c
        // CTRL on Windows and CMD (metaKey) on Mac are used for OS copy and
        // thus should prevent the definition copy.
        // `metaKey` is the '⊞ Windows' key on Windows but that probably won't
        // matter.
        if (ev.ctrlKey || ev.metaKey) {
          shouldPreventDefault = false;
        } else {
          chrome.runtime.sendMessage({
            type: 'copyToClip',
            entry: this.lastFound,
          });
        }
        break;
      case 66: {
        // b
        const rikaichan = (ev.currentTarget! as Window).rikaichan!;
        // For some reason it claims it can be const even though it's decremented.
        // eslint-disable-next-line prefer-const
        let ofs = rikaichan.uofs;
        for (i = 50; i > 0; --i) {
          rikaichan.uofs = --ofs!;
          if (this.show(rikaichan, this.defaultDict) >= 0) {
            // TODO: Figure out if this should be changed as per ancient comment.
            if (ofs! >= rikaichan.uofs) {
              break;
            } // ! change later
          }
        }
        break;
      }
      case 68: // d
        chrome.runtime.sendMessage({ type: 'switchOnlyReading' });
        this.show((ev.currentTarget! as Window).rikaichan!, this.sameDict);
        break;
      // @ts-expect-error: Fallthrough here used to share lookup logic with different step length.
      case 77: // m: move forward one character
        (ev.currentTarget! as Window).rikaichan!.uofsNext = 1;
      // Falls through
      case 78: {
        // n: move forward one word
        const rikaiData = (ev.currentTarget! as Window).rikaichan!;
        for (i = 50; i > 0; --i) {
          rikaiData.uofs! += rikaiData.uofsNext!;
          if (this.show(rikaiData, this.defaultDict) >= 0) {
            break;
          }
        }
        break;
      }
      case 89: // y
        this.altView = 0;
        (ev.currentTarget! as Window).rikaichan!.popY! += 20;
        this.show((ev.currentTarget! as Window).rikaichan!, this.sameDict);
        break;
      default:
        return;
    }

    this.keysDown[ev.keyCode] = 1;

    // don't eat shift if in this mode
    if (shouldPreventDefault) {
      ev.preventDefault();
    }
  }

  mDown = false;

  onMouseDown = (ev: MouseEvent) => {
    this._onMouseDown(ev);
  };
  _onMouseDown(ev: MouseEvent) {
    if (ev.button !== 0) {
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
    if (!('form' in ev.target!)) {
      window.rikaichan!.oldCaret = -1;
    } else {
      window.rikaichan!.oldTA = ev.target;
    }
  }

  onMouseUp = (ev: MouseEvent) => {
    this._onMouseUp(ev);
  };
  _onMouseUp(ev: MouseEvent) {
    if (ev.button !== 0) {
      return;
    }
    this.mDown = false;
  }

  onKeyUp = (ev: KeyboardEvent) => {
    if (this.keysDown[ev.keyCode]) {
      this.keysDown[ev.keyCode] = 0;
    }
  };

  unicodeInfo(c: string) {
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
  }

  namesN = 2;

  inlineNames = {
    // text node
    '#text': true,

    // font style
    FONT: true,
    TT: true,
    I: true,
    B: true,
    BIG: true,
    SMALL: true,
    // deprecated
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
    let: true,
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
  };

  isInline(node: Node) {
    return (
      Object.prototype.hasOwnProperty.call(this.inlineNames, node.nodeName) ||
      // only check styles for elements
      // comments do not have getComputedStyle method
      (document.nodeType === Node.ELEMENT_NODE &&
        (document
          .defaultView!.getComputedStyle(node as Element, null)
          .getPropertyValue('display') === 'inline' ||
          document
            .defaultView!.getComputedStyle(node as Element, null)
            .getPropertyValue('display') === 'inline-block'))
    );
  }

  // XPath expression which evaluates to text nodes
  // tells rikaichan which text to translate
  // expression to get all text nodes that are not in (RP or RT) elements
  textNodeExpr =
    'descendant-or-self::text()[not(parent::rp) and not(ancestor::rt)]';

  // XPath expression which evaluates to a boolean. If it evaluates to true
  // then rikaichan will not start looking for text in this text node
  // ignore text in RT elements
  startElementExpr = 'boolean(parent::rp or ancestor::rt)';

  // Gets text from a node
  // returns a string
  // node: a node
  // selEnd: the selection end object will be changed as a side effect
  // maxLength: the maximum length of returned string
  // xpathExpr: an XPath expression, which evaluates to text nodes, will be evaluated
  // relative to "node" argument
  getInlineText(
    node: Node,
    selEndList: { node: CharacterData; offset: number }[],
    maxLength: number,
    xpathExpr: XPathExpression
  ) {
    let text = '';
    let endIndex;

    if (node.nodeName === '#text') {
      const textNode = node as Text;
      endIndex = Math.min(maxLength, textNode.data.length);
      selEndList.push({ node: textNode, offset: endIndex });
      return textNode.data.substring(0, endIndex);
    }

    // The given xpath expression returns text nodes so
    // we can safely cast to Text at this point.
    // TODO(melink14): Figure out how to encode that as type
    const result = xpathExpr.evaluate(
      node,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null
    );
    let nextNode: Text | null;
    while (
      text.length < maxLength &&
      (nextNode = result.iterateNext() as Text | null)
    ) {
      // Since these nodes are text nodes we can assume parentElement exists.
      if (!this.isElementVisible(nextNode.parentElement!)) {
        // If a node isn't visible it shouldn't be part of our text look up.
        // See issue #366 for an example where it breaks look ups.
        continue;
      }
      endIndex = Math.min(nextNode.data.length, maxLength - text.length);
      text += nextNode.data.substring(0, endIndex);
      selEndList.push({ node: nextNode, offset: endIndex });
    }

    return text;
  }

  private isElementVisible(element: HTMLElement) {
    const style = window.getComputedStyle(element);
    return style.visibility !== 'hidden' && style.display !== 'none';
  }

  // given a node which must not be null,
  // returns either the next sibling or next sibling of the father or
  // next sibling of the fathers father and so on or null
  getNext(node: Node): Node | null {
    let nextNode;

    if ((nextNode = node.nextSibling) !== null) {
      return nextNode;
    }
    if ((nextNode = node.parentNode) !== null && this.isInline(nextNode)) {
      return this.getNext(nextNode);
    }

    return null;
  }

  getTextFromRange(
    rangeParent: Node,
    offset: number,
    selEndList: { node: CharacterData; offset: number }[],
    maxLength: number
  ) {
    if (
      rangeParent.nodeName === 'TEXTAREA' ||
      rangeParent.nodeName === 'INPUT'
    ) {
      const pseudoTextNode = rangeParent as CharacterData &
        (HTMLTextAreaElement | HTMLInputElement);
      const endIndex = Math.min(pseudoTextNode.data.length, offset + maxLength);
      return pseudoTextNode.value.substring(offset, endIndex);
    }

    if (rangeParent.nodeType !== Node.TEXT_NODE) {
      return '';
    }

    const textRange = rangeParent as Text;

    let text = '';

    const xpathExpr = textRange.ownerDocument!.createExpression(
      this.textNodeExpr,
      null
    );

    if (
      textRange.ownerDocument!.evaluate(
        this.startElementExpr,
        textRange,
        null,
        XPathResult.BOOLEAN_TYPE,
        null
      ).booleanValue
    ) {
      return '';
    }

    const endIndex = Math.min(textRange.data.length, offset + maxLength);
    text += textRange.data.substring(offset, endIndex);
    selEndList.push({ node: textRange, offset: endIndex });

    let nextNode = textRange as Node | null;
    while (
      nextNode !== null &&
      (nextNode = this.getNext(nextNode)) !== null &&
      this.isInline(nextNode) &&
      text.length < maxLength
    ) {
      text += this.getInlineText(
        nextNode,
        selEndList,
        maxLength - text.length,
        xpathExpr
      );
    }

    return text;
  }

  // Hack because SelEnd can't be sent in messages
  lastSelEnd: { node: CharacterData; offset: number }[] = [];
  // Hack because ro was coming out always 0 for some reason.
  lastRo = 0;

  show(tdata: Rikaichan, dictOption: number) {
    const rp = tdata.prevRangeNode;
    let ro = tdata.prevRangeOfs! + tdata.uofs!;
    let u;

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
    while ((u = rp.data.charCodeAt(ro)) === 32 || u === 9 || u === 10) {
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
      (u !== 0x25cb &&
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
    const selEndList: { node: CharacterData; offset: number }[] = [];
    const text = this.getTextFromRange(rp, ro, selEndList, 13 /* maxlength*/);

    this.lastSelEnd = selEndList;
    this.lastRo = ro;
    chrome.runtime.sendMessage(
      { type: 'xsearch', text: text, dictOption: String(dictOption) },
      this.processEntry
    );

    return 1;
  }

  processEntry = (e: DictEntryData | null): void => {
    const tdata = window.rikaichan!;
    const ro = this.lastRo;
    const selEndList = this.lastSelEnd;

    if (!e) {
      this.hidePopup();
      this.clearHi();
      return;
    }
    this.lastFound = [e];

    if (!e.matchLen) {
      e.matchLen = 1;
    }
    tdata.uofsNext = e.matchLen;
    tdata.uofs = ro - tdata.prevRangeOfs!;

    const rp = tdata.prevRangeNode;
    // don't try to highlight form elements
    if (
      rp &&
      ((tdata.config!.highlight &&
        !this.mDown &&
        !('form' in tdata.prevTarget!)) ||
        ('form' in tdata.prevTarget! && tdata.config!.textboxhl))
    ) {
      const doc = rp.ownerDocument;
      if (!doc) {
        this.clearHi();
        this.hidePopup();
        return;
      }
      this.highlightMatch(doc, rp, ro, e.matchLen, selEndList, tdata);
      tdata.prevSelView! = doc.defaultView!;
    }

    chrome.runtime.sendMessage(
      { type: 'makehtml', entry: e },
      this.processHtml
    );
  };

  processHtml = (html: string) => {
    const tdata = window.rikaichan!;
    this.showPopup(html, tdata.prevTarget, tdata.popX, tdata.popY, false);
    return 1;
  };

  highlightMatch(
    doc: Document,
    rp: Node,
    ro: number,
    matchLen: number,
    selEndList: { node: CharacterData; offset: number }[],
    tdata: Rikaichan
  ) {
    const sel = doc.defaultView!.getSelection()!;

    // If selEndList is empty then we're dealing with a textarea/input situation
    if (selEndList.length === 0) {
      try {
        if (rp.nodeName === 'TEXTAREA' || rp.nodeName === 'INPUT') {
          const textNode = rp as HTMLTextAreaElement | HTMLInputElement;
          // If there is already a selected region not caused by
          // rikaikun, leave it alone
          if (sel.toString() && tdata.selText !== sel.toString()) {
            return;
          }

          // If there is no selected region and the saved
          // textbox is the same as teh current one
          // then save the current cursor position
          // The second half of the condition let's us place the
          // cursor in another text box without having it jump back
          if (!sel.toString() && tdata.oldTA! === textNode) {
            tdata.oldCaret = textNode.selectionStart!;
            tdata.oldTA = textNode;
          }
          textNode.selectionStart = ro;
          textNode.selectionEnd = matchLen + ro;

          tdata.selText = textNode.value.substring(ro, matchLen + ro);
        }
      } catch (err) {
        // If there is an error it is probably caused by the input type
        // being not text.  This is the most general way to deal with
        // arbitrary types.

        // we set oldTA to undefined because we don't want to do weird stuff
        // with buttons
        tdata.oldTA = undefined;
        // console.log("invalid input type for selection:" + rp.type);
        console.log(err.message);
      }
      return;
    }

    // Special case for leaving a text box to an outside japanese
    // Even if we're not currently in a text area we should save
    // the last one we were in.
    if (tdata.oldTA && !sel.toString() && tdata.oldCaret! >= 0) {
      tdata.oldCaret = tdata.oldTA.selectionStart!;
    }

    let selEnd: { node: CharacterData; offset: number };
    let offset = matchLen + ro;

    for (let i = 0, len = selEndList.length; i < len; i++) {
      selEnd = selEndList[i];
      if (offset <= selEnd.offset) {
        break;
      }
      offset -= selEnd.offset;
    }

    const range = doc.createRange();
    range.setStart(rp, ro);
    range.setEnd(selEnd!.node, offset);

    if (sel.toString() && tdata.selText !== sel.toString()) {
      return;
    }
    sel.removeAllRanges();
    sel.addRange(range);
    tdata.selText = sel.toString();

    if (window.rikaichan!.config!.ttsEnabled) {
      const text = sel.toString();
      if (text.length > 0) {
        chrome.runtime.sendMessage({ type: 'playTTS', text: text });
      }
    }
  }

  showTitle(tdata: Rikaichan) {
    chrome.runtime.sendMessage(
      { type: 'translate', title: tdata.title },
      this.processTitle
    );
  }

  processTitle = (e: DictEntryData & { textLen: number }) => {
    const tdata = window.rikaichan!;

    if (!e) {
      this.hidePopup();
      return;
    }

    // TODO(#529): Why does this replace all characters with HTML escape codes
    // eslint-disable-next-line no-control-regex
    e.title = tdata.title!.substr(0, e.textLen).replace(/[\x00-\xff]/g, (c) => {
      return '&#' + c.charCodeAt(0) + ';';
    });
    if (tdata.title!.length > e.textLen) {
      e.title += '...';
    }

    this.lastFound = [e];

    chrome.runtime.sendMessage(
      { type: 'makehtml', entry: e },
      this.processHtml
    );
  };

  getFirstTextChild(node: Node) {
    return document
      .evaluate(
        'descendant::text()[not(parent::rp) and not(ancestor::rt)]',
        node,
        null,
        XPathResult.ANY_TYPE,
        null
      )
      .iterateNext();
    //
  }

  makeFake(real: HTMLTextAreaElement | HTMLInputElement) {
    const fake = document.createElement('div');
    const realRect = real.getBoundingClientRect();
    fake.innerText = real.value;
    fake.style.cssText = document.defaultView!.getComputedStyle(
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
  }

  getTotalOffset(parent: Node, tNode: Node, offset: number) {
    let fChild = parent.firstChild!;
    let realO = offset;
    if (fChild === tNode) {
      return offset;
    }
    do {
      let val = 0;
      if (fChild.nodeName === 'BR') {
        val = 1;
      } else {
        const maybeText = fChild as CharacterData;
        val = maybeText.data ? maybeText.data.length : 0;
      }
      realO += val;
    } while ((fChild = fChild.nextSibling!) !== tNode);

    return realO;
  }

  onMouseMove = (ev: MouseEvent) => {
    this.lastPos.x = ev.clientX;
    this.lastPos.y = ev.clientY;
    this.lastTarget = ev.target;
    this.tryUpdatePopup(ev);
  };
  tryUpdatePopup(ev: MouseEvent & { noDelay?: boolean }) {
    const altGraph = ev.getModifierState && ev.getModifierState('AltGraph');

    if (
      (window.rikaichan!.config!.showOnKey.includes('Alt') &&
        !ev.altKey &&
        !altGraph) ||
      (window.rikaichan!.config!.showOnKey.includes('Ctrl') && !ev.ctrlKey)
    ) {
      this.clearHi();
      this.hidePopup();
      return;
    }

    let fake;
    const tdata = window.rikaichan!; // per-tab data
    let range;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rp: any;
    let ro: number;
    const eventTarget = ev.target as HTMLElement &
      (HTMLTextAreaElement | HTMLInputElement) &
      HTMLImageElement &
      HTMLOptionElement &
      HTMLSelectElement;
    // Put this in a try catch so that an exception here doesn't prevent editing due to div.
    try {
      if (
        eventTarget.nodeName === 'TEXTAREA' ||
        eventTarget.nodeName === 'INPUT'
      ) {
        fake = this.makeFake(
          eventTarget as HTMLTextAreaElement | HTMLInputElement
        );
        document.body.appendChild(fake);
        fake.scrollTop = eventTarget.scrollTop;
        fake.scrollLeft = eventTarget.scrollLeft;
      }
      // Calculate range and friends here after we've made our fake textarea/input divs.
      range = document.caretRangeFromPoint(ev.clientX, ev.clientY);
      const startNode = range.startContainer;
      ro = range.startOffset;

      rp = startNode as CharacterData;

      if (fake) {
        // At the end of a line, don't do anything or you just get beginning of next line
        if (rp.data && rp.data.length === ro) {
          document.body.removeChild(fake);
          return;
        }
        fake.style.display = 'none';
        ro = this.getTotalOffset(rp.parentNode!, rp, ro);
      }

      // This is to account for bugs in caretRangeFromPoint
      // It includes the fact that it returns text nodes over non text nodes
      // and also the fact that it miss the first character of inline nodes.

      // If the range offset is equal to the node data length
      // Then we have the second case and need to correct.
      if (rp.data && ro === rp.data.length) {
        // A special exception is the WBR tag which is inline but doesn't
        // contain text.
        if (rp.nextSibling && rp.nextSibling.nodeName === 'WBR') {
          rp = rp.nextSibling.nextSibling;
          ro = 0;
        }
        // If we're to the right of an inline character we can use the target.
        // However, if we're just in a blank spot don't do anything.
        else if (this.isInline(eventTarget)) {
          if (rp.parentNode === eventTarget) {
            // TODO(melink14): Figure out why this is empty
          } else if (fake && rp.parentNode.innerText === eventTarget.value) {
            // TODO(melink14): Figure out why this is empty
          } else {
            rp = eventTarget.firstChild;
            ro = 0;
          }
        }
        // Otherwise we're on the right and can take the next sibling of the
        // inline element.
        else {
          rp = rp.parentNode.nextSibling;
          ro = 0;
        }
      }
      // The case where the before div is empty so the false spot is in the parent
      // But we should be able to take the target.
      // The 1 seems random but it actually represents the preceding empty tag
      // also we don't want it to mess up with our fake div
      // Also, form elements don't seem to fall into this case either.
      if (
        !fake &&
        !('form' in eventTarget) &&
        rp &&
        rp.parentNode !== eventTarget &&
        ro === 1
      ) {
        rp = this.getFirstTextChild(eventTarget);
        ro = 0;
      }

      // Otherwise, we're off in nowhere land and we should go home.
      // offset should be 0 or max in this case.
      else if (!fake && (!rp || rp.parentNode !== eventTarget)) {
        rp = null;
        ro = -1;
      }

      // For text nodes do special stuff
      // we make rp the text area and keep the offset the same
      // we give the text area data so it can act normal
      if (fake) {
        rp = eventTarget;
        rp.data = rp.value;
      }

      if (eventTarget === tdata.prevTarget && this.isVisible()) {
        // console.log("exit due to same target");
        if (tdata.title) {
          if (fake) {
            document.body.removeChild(fake);
          }
          return;
        }
        if (rp === tdata.prevRangeNode && ro === tdata.prevRangeOfs) {
          if (fake) {
            document.body.removeChild(fake);
          }
          return;
        }
      }

      if (fake) {
        document.body.removeChild(fake);
      }
    } catch (err) {
      console.log(err.message);
      if (fake) {
        document.body.removeChild(fake);
      }
      return;
    }

    tdata.prevTarget = eventTarget;
    tdata.prevRangeNode = rp;
    tdata.prevRangeOfs = ro;
    tdata.title = undefined;
    tdata.uofs = 0;
    tdata.uofsNext = 1;

    const delay = ev.noDelay ? 1 : window.rikaichan!.config!.popupDelay;

    if (rp && rp.data && ro < rp.data.length) {
      this.forceKanji = ev.shiftKey ? 1 : 0;
      tdata.popX = ev.clientX;
      tdata.popY = ev.clientY;
      tdata.timer = window.setTimeout(
        (rangeNode: CharacterData | undefined, rangeOffset: number) => {
          // TODO(melink14): This was using `ro` directly instead of `rangeOffset`
          // do we even need to pass arguments if we can use the closure?
          if (
            !window.rikaichan ||
            rangeNode !== window.rikaichan.prevRangeNode ||
            rangeOffset !== window.rikaichan.prevRangeOfs
          ) {
            return;
          }
          this.show(
            tdata,
            this.forceKanji ? this.forceKanji : this.defaultDict
          );
        },
        delay,
        rp,
        ro
      );
      return;
    }

    // TODO: Consider making title translations configurable.
    if (typeof eventTarget.title === 'string' && eventTarget.title.length) {
      tdata.title = eventTarget.title;
    } else if (typeof eventTarget.alt === 'string' && eventTarget.alt.length) {
      tdata.title = eventTarget.alt;
    }

    // FF3
    if (eventTarget.nodeName === 'OPTION') {
      tdata.title = eventTarget.text;
    } else if (eventTarget.nodeName === 'SELECT') {
      tdata.title = eventTarget.options[eventTarget.selectedIndex].text;
    }

    if (tdata.title) {
      tdata.popX = ev.clientX;
      tdata.popY = ev.clientY;
      tdata.timer = window.setTimeout(
        (tdata: Rikaichan, title: string | undefined) => {
          if (!window.rikaichan || title !== window.rikaichan.title) {
            return;
          }
          this.showTitle(tdata);
        },
        delay,
        tdata,
        tdata.title
      );
    } else {
      // dont close just because we moved from a valid popup slightly over to a place with nothing
      const dx = tdata.popX! - ev.clientX;
      const dy = tdata.popY! - ev.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 4) {
        this.clearHi();
        this.hidePopup();
      }
    }
  }
}

const rcxContent = new RcxContent();

// Event Listeners
chrome.runtime.onMessage.addListener((request) => {
  switch (request.type) {
    case 'enable':
      rcxContent.enableTab(request.config);
      break;
    case 'disable':
      rcxContent.disableTab();
      break;
    case 'showPopup':
      rcxContent.showPopup(request.text);
      break;
    default:
  }
});

// When a page first loads, checks to see if it should enable script
chrome.runtime.sendMessage({ type: 'enable?' });

export { RcxContent as TestOnlyRcxContent };
