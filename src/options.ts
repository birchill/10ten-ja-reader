interface Window {
  rcxMain: { config: Config };
}

const config = browser.extension.getBackgroundPage().rcxMain.config;

function completeForm() {
  const grid = document.getElementById('key-grid');

  for (const setting of config.DEFAULT_KEY_SETTINGS) {
    const keyBlock = document.createElement('div');
    keyBlock.classList.add('key');
    keyBlock.classList.add('browser-style');

    for (const key of setting.keys) {
      const keyInput = document.createElement('input');
      keyInput.setAttribute('type', 'checkbox');
      keyInput.setAttribute('id', `key-${setting.name}-${key}`);
      keyInput.setAttribute('name', `key-${setting.name}-${key}`);
      keyInput.classList.add(`key-${setting.name}`);
      keyInput.dataset.key = key;
      keyBlock.appendChild(keyInput);

      keyInput.addEventListener('click', evt => {
        const checkedKeys = document.querySelectorAll(
          `input[type=checkbox].key-${setting.name}:checked`
        );
        // We need to use postMessage so that the Array is cloned into the
        // background page's compartment.
        const backgroundWindow = browser.extension.getBackgroundPage();
        backgroundWindow.postMessage(
          {
            type: 'updateKeys',
            keys: {
              [setting.name]: Array.from(checkedKeys).map(
                checkbox => (checkbox as HTMLInputElement).dataset.key
              ),
            },
          },
          window.location.origin
        );
      });

      const keyLabel = document.createElement('label');
      keyLabel.setAttribute('for', `key-${setting.name}-${key}`);
      keyLabel.textContent = key;
      keyBlock.appendChild(keyLabel);
    }

    grid.appendChild(keyBlock);

    const keyDescription = document.createElement('div');
    keyDescription.classList.add('key-description');
    keyDescription.textContent = setting.description;
    grid.appendChild(keyDescription);
  }

  // TODO: Use REF_ABBREVIATIONS to generate the HTML for options.html too.

  for (const ref of Object.keys(config.kanjiReferences)) {
    document.getElementById(ref).addEventListener('click', evt => {
      config.updateKanjiReferences({
        [ref]: (evt.target as HTMLInputElement).checked,
      });
    });
  }

  document.getElementById('showDefinitions').addEventListener('click', evt => {
    config.readingOnly = !(evt.target as HTMLInputElement).checked;
  });

  document.getElementById('highlightText').addEventListener('click', evt => {
    config.noTextHighlight = !(evt.target as HTMLInputElement).checked;
  });

  document
    .getElementById('contextMenuEnable')
    .addEventListener('click', evt => {
      config.contextMenuEnable = (evt.target as HTMLInputElement).checked;
    });

  document
    .getElementById('showKanjiComponents')
    .addEventListener('click', evt => {
      config.showKanjiComponents = (evt.target as HTMLInputElement).checked;
    });

  document.getElementById('popupStyle').addEventListener('click', evt => {
    config.popupStyle = (evt.target as HTMLInputElement).value;
  });
}

async function fillVals() {
  await config.ready;

  const optform = document.getElementById('optform') as HTMLFormElement;
  optform.showDefinitions.checked = !config.readingOnly;
  optform.highlightText.checked = !config.noTextHighlight;
  optform.contextMenuEnable.checked = config.contextMenuEnable;
  optform.showKanjiComponents.checked = config.showKanjiComponents;
  optform.popupStyle.value = config.popupStyle;

  for (const [setting, keys] of Object.entries(config.keys)) {
    const checkboxes = document.querySelectorAll(
      `input[type=checkbox].key-${setting}`
    );
    for (const checkbox of checkboxes) {
      (checkbox as HTMLInputElement).checked = keys.includes(
        (checkbox as HTMLInputElement).dataset.key
      );
    }
  }

  for (const [abbrev, setting] of Object.entries(config.kanjiReferences)) {
    (document.getElementById(abbrev) as HTMLInputElement).checked = setting;
  }
}

window.onload = () => {
  completeForm();
  fillVals();
  config.addChangeListener(fillVals);
};

window.onunload = () => {
  config.removeChangeListener(fillVals);
};
