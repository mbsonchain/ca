import { mountAtlas } from './atlas.js';
import { interviewPath, renderInterviewPage } from './collection.js';
import { setupMapLabels } from './map-labels.js';
import { setupCards } from './place-cards.js';
import { homeClock, startCountdown } from './countdown.js';
import { bar, bySlug, placeUrl, renderTown } from './town-page.js';
import { setupDirections, setupMapArtwork } from './directions.js';
import { lockMapGestures } from './map-gestures.js';

const main = document.querySelector('#main');
let cleanup = () => {};
let artwork;

function render({ focus = false } = {}) {
  cleanup();
  cleanup = () => {};
  const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const home = path === '/';
  const atlas = home || path === '/travel-guide' ? mountAtlas(main, home) : null;
  document.body.classList.toggle('fixed-map-page', Boolean(atlas));
  if (atlas && !artwork) artwork = setupMapArtwork(atlas);
  if (!atlas && artwork) { artwork.dispose(); artwork = null; }
  const isInterview = path === '/visit-conamore' || path === interviewPath;
  document.body.classList.toggle('collection-page', isInterview);
  let section = '';
  if (home) {
    artwork.show('home');
    document.title = 'CONAMORE';
    const footer = document.querySelector('.site-footer');
    if (!footer.querySelector('.site-countdown')) footer.insertAdjacentHTML('afterbegin', homeClock);
    const clock = footer.querySelector('.site-countdown');
    const stopClock = startCountdown(clock);
    cleanup = () => { stopClock(); clock.remove(); };
  } else if (atlas) {
    section = 'guide';
    document.title = 'Travel guide — CONAMORE';
    const cleanLabels = setupMapLabels(atlas);
    const directions = setupDirections(atlas, artwork);
    const cleanCards = setupCards(main, button => {
      const p = bySlug.get(button.dataset.place);
      return { title: p.name, intro: p.intro, eyebrow: p.region, url: placeUrl(p) };
    }, directions);
    cleanup = () => { cleanCards(); cleanLabels(); directions.dispose(); };
  } else if (path.startsWith('/travel-guide/') && bySlug.has(path.split('/')[2]) && path.split('/').length === 3) {
    section = 'guide';
    const place = bySlug.get(path.split('/')[2]);
    document.title = `${place.name} — CONAMORE`;
    if (main.dataset.place !== place.slug) main.innerHTML = renderTown(place);
  } else if (isInterview) {
    section = 'collection';
    document.title = 'Interview — CONAMORE';
    if (!main.querySelector('.interview-content')) main.innerHTML = renderInterviewPage();
  } else {
    document.title = 'Not found — CONAMORE';
    main.innerHTML = `${bar()}<section class="not-found"><h1>off the map.</h1><p><a href="/travel-guide">back to the travel guide →</a></p></section>`;
  }
  main.removeAttribute('data-place');
  document.querySelectorAll('[data-nav]').forEach(a => {
    if (a.dataset.nav === section) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (focus) main.focus({ preventScroll: true });
}

function navigate(url) {
  history.replaceState({ ...history.state, scroll: scrollY }, '', location.href);
  history.pushState({}, '', url);
  render({ focus: true });
  window.scrollTo(0, 0);
}
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || url.hash || /\.[a-z0-9]+$/i.test(url.pathname)) return;
  event.preventDefault();
  navigate(url.pathname + url.search);
});
window.addEventListener('popstate', () => {
  render({ focus: true });
  window.scrollTo(0, history.state?.scroll || 0);
});
history.scrollRestoration = 'manual';
lockMapGestures(document);
render();
