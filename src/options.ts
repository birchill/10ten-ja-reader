interface Window {
  rcxMain: { config: Config };
}

const config = browser.extension.getBackgroundPage().rcxMain.config;

async function fillVals() {
  await config.ready;

  const optform = document.getElementById('optform') as HTMLFormElement;
  optform.showDefinitions.checked = !config.readingOnly;
  optform.highlightText.checked = !config.noTextHighlight;
  optform.showKanjiComponents.checked = config.showKanjiComponents;

  for (const [abbrev, setting] of Object.entries(config.kanjiReferences)) {
    (document.getElementById(abbrev) as HTMLInputElement).checked = setting;
  }

  // TODO: Use REF_ABBREVIATIONS to generate the HTML for options.html too.
}

window.onload = () => {
  fillVals();
  config.addChangeListener(fillVals);
};

window.onunload = () => {
  config.removeChangeListener(fillVals);
};

document.getElementById('showDefinitions').addEventListener('click', evt => {
  config.readingOnly = !(evt.target as HTMLInputElement).checked;
});

document.getElementById('highlightText').addEventListener('click', evt => {
  config.noTextHighlight = !(evt.target as HTMLInputElement).checked;
});

document
  .getElementById('showKanjiComponents')
  .addEventListener('click', evt => {
    config.showKanjiComponents = (evt.target as HTMLInputElement).checked;
  });

for (const ref of Object.keys(config.kanjiReferences)) {
  document.getElementById(ref).addEventListener('click', evt => {
    config.updateKanjiReferences({
      [ref]: (evt.target as HTMLInputElement).checked,
    });
  });
}
