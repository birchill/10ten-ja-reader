function show(platform, enabled) {
  document.body.classList.add(`platform-${platform}`);

  if (typeof enabled === 'boolean') {
    document.body.classList.toggle('state-on', enabled);
    document.body.classList.toggle('state-off', !enabled);
  } else {
    document.body.classList.remove('state-on');
    document.body.classList.remove('state-off');
  }

  setupCarousel();
}

function openPreferences() {
  webkit.messageHandlers.controller.postMessage('open-preferences');
}

document
  .querySelector('button.open-preferences')
  .addEventListener('click', openPreferences);

function setupCarousel() {
  const slides = Array.from(document.querySelectorAll('.carousel .slide'));
  const dots = Array.from(document.querySelectorAll('.carousel .dots .dot'));

  let selected = slides.findIndex((s) => s.classList.contains('active')) || 0;

  const select = (i) => {
    selected = i;
    for (const [index, slide] of slides.entries()) {
      slide.classList.toggle('active', index === i);
    }
    for (const [index, dot] of dots.entries()) {
      dot.classList.toggle('active', index === i);
    }
  };

  for (const slide of slides) {
    slide.addEventListener('click', () => {
      select(Math.min(selected + 1, slides.length - 1));
    });
  }

  for (const dot of dots) {
    dot.addEventListener('click', (event) => {
      const index = dots.findIndex((dot) => dot === event.target);
      if (index === -1) {
        return;
      }
      select(index);
    });
  }

  const prevArrow = document.querySelector('.carousel .arrow.prev');
  prevArrow.addEventListener('click', () => {
    select(Math.max(selected - 1, 0));
  });

  const nextArrow = document.querySelector('.carousel .arrow.next');
  nextArrow.addEventListener('click', () => {
    select(Math.min(selected + 1, slides.length - 1));
  });
}
