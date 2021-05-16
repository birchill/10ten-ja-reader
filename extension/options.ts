import 'lit-toast/lit-toast.js';
import { Config, getCurrentConfiguration } from './configuration';
import { LitElement, TemplateResult, css, html } from 'lit';
import { until } from 'lit/directives/until.js';

export class OptionsForm extends LitElement {
  private content: Promise<TemplateResult> = this.fetchAndRender();

  private options?: Config;

  render() {
    return html`${until(this.content)}<lit-toast></lit-toast>`;
  }

  async fetchAndRender() {
    this.options = await getCurrentConfiguration();
    return html`
      <div id="rikaikun_options">
        <form id="optform" name="optform" @change="${this.saveOptions}">
          <div id="options">
            <div id="gencon" class="tabContent">
              <h1>General</h1>
              <p>
                Popup color:
                <select class="inputfield" id="popupcolor" name="popupcolor">
                  <option
                    value="blue"
                    ?selected=${this.options.popupcolor === 'blue'}
                  >
                    Blue
                  </option>
                  <option
                    value="lightblue"
                    ?selected=${this.options.popupcolor === 'lightblue'}
                  >
                    Light Blue
                  </option>
                  <option
                    value="black"
                    ?selected=${this.options.popupcolor === 'black'}
                  >
                    Black
                  </option>
                  <option
                    value="yellow"
                    ?selected=${this.options.popupcolor === 'yellow'}
                  >
                    Yellow
                  </option>
                </select>
                <br />
                Default popup location:
                <select
                  class="inputfield"
                  id="popupLocation"
                  name="popupLocation"
                  .selectedIndex=${this.options.popupLocation}
                >
                  <option value="0">Cursor</option>
                  <option value="1">Top Left</option>
                  <option value="2">Bottom Right</option>
                </select>
                <br />
                <input
                  type="checkbox"
                  id="highlight"
                  name="highlight"
                  ?checked=${this.options.highlight}
                />
                Highlight text
                <br />
                <input
                  type="checkbox"
                  id="textboxhl"
                  name="textboxhl"
                  ?checked=${this.options.textboxhl}
                />
                Highlight text inside of text boxes
                <br />
                <input
                  type="checkbox"
                  id="onlyreading"
                  name="onlyreading"
                  ?checked=${this.options.onlyreading}
                />
                Hide definitions and show only reading
                <br />
                <input
                  type="checkbox"
                  id="minihelp"
                  name="minihelp"
                  ?checked=${this.options.minihelp}
                />
                Show mini help
                <br />
                <br />
                Show popup with delay:
                <input
                  type="number"
                  id="popupDelay"
                  name="popupDelay"
                  min="1"
                  value=${this.options.popupDelay}
                />
                milliseconds
              </p>
            </div>
            <div id="keycon" class="tabContent">
              <h1>Keyboard</h1>
              Show popup only on pressed key:<br />
              <input
                type="radio"
                name="showOnKey"
                value=""
                ?checked=${this.options.showOnKey === ''}
              />Not used<br />
              <input
                type="radio"
                name="showOnKey"
                value="Alt"
                ?checked=${this.options.showOnKey === 'Alt'}
              />Alt<br />
              <input
                type="radio"
                name="showOnKey"
                value="Ctrl"
                ?checked=${this.options.showOnKey === 'Ctrl'}
              />Ctrl<br />
              <input
                type="radio"
                name="showOnKey"
                value="Alt+Ctrl"
                ?checked=${this.options.showOnKey === 'Alt+Ctrl'}
              />Alt+Ctrl<br />
              <br />
              <strong>Keys when popup is visible</strong><br /><br />
              <table>
                <tr>
                  <td>A</td>
                  <td>Alternate popup location</td>
                </tr>
                <tr>
                  <td>Y</td>
                  <td>Move popup location down</td>
                </tr>
                <tr>
                  <td>C</td>
                  <td>Copy to clipboard</td>
                </tr>
                <tr>
                  <td>D</td>
                  <td>Hide/show definitions</td>
                </tr>
                <tr>
                  <td>Shift/Enter&nbsp;&nbsp;</td>
                  <td>Switch dictionaries</td>
                </tr>
                <tr>
                  <td>B</td>
                  <td>Previous character</td>
                </tr>
                <tr>
                  <td>M</td>
                  <td>Next character</td>
                </tr>
                <tr>
                  <td>N</td>
                  <td>Next word</td>
                </tr>
                <tr>
                  <td>J</td>
                  <td>Scroll back definitions</td>
                </tr>
                <tr>
                  <td>K</td>
                  <td>Scroll forward definitions</td>
                </tr>
              </table>
              <br />
              <input
                type="checkbox"
                id="disablekeys"
                name="disablekeys"
                ?checked=${this.options.disablekeys}
              />
              Disable these keys
            </div>
            <div id="kanjicon" class="tabContent">
              <h1>Kanji Dictionary</h1>
              <p>
                <strong>Displayed information:</strong><br /><br />
                <input
                  type="checkbox"
                  id="kanjicomponents"
                  name="kanjicomponents"
                  ?checked=${this.options.kanjicomponents}
                />
                Kanji Components
                <br />
                ${this.options.kanjiInfo.map((component) => {
                  return html`
                    <input
                      type="checkbox"
                      id=${component.code}
                      name="kanjiInfo"
                      value=${component.code}
                      ?checked=${component.shouldDisplay}
                    />
                    ${component.name}
                    <br />
                  `;
                })}
              </p>
            </div>
            <div id="clipcon" class="tabContent">
              <h1>Copy to Clipboard</h1>
              <table>
                <tr>
                  <td>Line ending:</td>
                  <td>
                    <select id="lineEnding" name="lineEnding">
                      <option
                        value="n"
                        ?selected=${this.options.lineEnding === 'n'}
                      >
                        Unix (\\n)
                      </option>
                      <option
                        value="rn"
                        ?selected=${this.options.lineEnding === 'rn'}
                      >
                        Windows (\\r\\n)
                      </option>
                      <option
                        value="r"
                        ?selected=${this.options.lineEnding === 'r'}
                      >
                        Mac (\\r)
                      </option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>Field separator:</td>
                  <td>
                    <select id="copySeparator" name="copySeparator">
                      <option
                        value="tab"
                        ?selected=${this.options.copySeparator === 'tab'}
                      >
                        Tab
                      </option>
                      <option
                        value="comma"
                        ?selected=${this.options.copySeparator === 'comma'}
                      >
                        Comma
                      </option>
                      <option
                        value="space"
                        ?selected=${this.options.copySeparator === 'space'}
                      >
                        Space
                      </option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>Maximum entries:</td>
                  <td>
                    <input
                      type="number"
                      id="maxClipCopyEntries"
                      name="maxClipCopyEntries"
                      min="1"
                      value=${this.options.maxClipCopyEntries}
                    />
                  </td>
                </tr>
              </table>
            </div>
            <div id="tts" class="tabContent">
              <h1>Text-To-Speech</h1>
              <input
                type="checkbox"
                id="ttsEnabled"
                name="ttsEnabled"
                ?checked=${this.options.ttsEnabled}
              />
              Enabled
            </div>
          </div>
        </form>
      </div>
    `;
  }

  static styles = css`
    #rikaikun_options,
    #rikaikun_options td {
      font-family: sans-serif;
      font-size: 10pt;
      padding: 0 10px;
    }
    table {
      border-spacing: 5px;
    }
    .tab {
      background-color: #eee;
      border: 1px solid #999;
      border-bottom: 0;
      color: #ccc;
      display: inline;
      font-style: italic;
      margin-left: 3px;
      padding: 5px;
    }

    .active-tab {
      color: #000;
      font-style: normal;
    }

    .selected-tab {
      background-color: #dde;
      color: #000;
      font-style: normal;
      font-weight: bold;
    }

    .tabContent.hide {
      display: none;
    }

    #options {
      background-color: #dde;
      border: 1px solid black;
      clear: both;
      padding: 10px;
    }

    #options p,
    #options form {
      margin: 0;
      padding: 0;
    }
  `;

  private saveOptions(event: Event) {
    // Since options is populated during render, it must be non null now.
    if (this.options == null) {
      throw new TypeError('options object should not be null.');
    }
    // Save these values for convenience since we need to type them as their
    // actual types.
    const target = event.target as HTMLInputElement;
    const key = target.name as keyof Config;
    // kanjiInfo is special since its value is another object.
    if (key === 'kanjiInfo') {
      this.options.kanjiInfo.find(
        (info) => info.code === target.value
      )!.shouldDisplay = target.checked;
    }
    // popupLocation is special since its a drop down whose values are
    // numbers instead of text.
    else if (key === 'popupLocation') {
      this.options.popupLocation = parseInt(target.value);
    } else {
      // Switch on the top of form element such that we can set the
      // value with te proper type.
      switch (target.type) {
        case 'number':
          const prevValue = this.options[key] as number;
          (this.options[key] as number) = safeParseInt(target.value, prevValue);
          break;
        case 'checkbox':
          (this.options[key] as boolean) = target.checked;
          break;
        case 'select-one':
        case 'radio':
          (this.options[key] as string) = target.value;
          break;
        default:
          console.error(`Unexpected input type in options: ${target.type}`);
      }
    }
    chrome.storage.sync.set(this.options, () => this.showToast());
  }

  private showToast() {
    this.shadowRoot!.querySelector('lit-toast')!.show('Saved', 2500);
  }
}

function safeParseInt(val: string, fallback: number) {
  let intVal = fallback;
  try {
    intVal = parseInt(val);
  } catch {
    console.error(`Failed to parse int value: ${val}`);
    return intVal;
  }
  return intVal;
}
customElements.define('options-form', OptionsForm);

// TODO(https://github.com/Victor-Bernabe/lit-toast/issues/2):
// Remove this if the component supports types directly.
interface LitToast {
  show(text: string, duration: number): Promise<void>;
}
declare global {
  interface HTMLElementTagNameMap {
    'lit-toast': LitToast;
  }
}
