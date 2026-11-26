import { places } from './places.js';
import { interviewPath, renderInterviewPage } from './collection.js';
import { setupMapLabels } from './map-labels.js';
import { setupCards } from './place-cards.js';
import { homeClock, startCountdown } from './countdown.js';
import { bar, bySlug, escape, mapImage, placeUrl, renderTown } from './town-page.js';
import { directionsControls, setupDirections } from './directions.js';
import { lockMapGestures } from './map-gestures.js';

const main = document.querySelector('#main');
let cleanup = () => {};

function mapLabel(place) {
  const left = ['amoretown', 'flowertown', 'open-city'].includes(place.slug);
  const below = ['sfida', 'orangepoint', 'clifftown'].includes(place.slug);
  const side = below ? 'below' : left ? 'left' : 'right';
  const dy = below ? 7 : ({ laketown: 6, santamore: 10, amoretown: -9, greenpoint: -8 }[place.slug] || 0);
  const name = escape(place.name).replace('Sunset Cliffs', 'Sunset<br>Cliffs');
  return `<span class="map-label" data-label="${place.slug}" data-x="${place.x}" data-side="${side}" style="top:calc(${place.y / 1536 * 100}% + ${dy}px)">${name}</span>`;
}

function flowers() {
  const flower = position => {
    const image = '<img src="/assets/conamore-flower.png" width="583" height="618" alt="" draggable="false">';
    const className = `side-flower side-flower--${position}`;
    return `<a class="${className}" href="/visit-conamore" aria-label="Visit CONAMORE">${image}</a>`;
  };
  return `<div class="side-flowers guide-flowers">
    <div class="flower-side flower-side--left">${flower('one')}${flower('two')}</div>
    <div class="flower-side flower-side--right">${flower('three')}${flower('four')}</div>
  </div>`;
}

function render({ focus = false } = {}) {
  cleanup();
  cleanup = () => {};
  const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  document.body.classList.toggle('fixed-map-page', ['/', '/travel-guide'].includes(path));
  const isInterview = path === '/visit-conamore' || path === interviewPath;
  document.body.classList.toggle('collection-page', isInterview);
  let section = '';
  if (path === '/') {
    document.title = 'CONAMORE';
    const footer = document.querySelector('.site-footer');
    if (!footer.querySelector('.site-countdown')) footer.insertAdjacentHTML('afterbegin', homeClock);
    const clock = footer.querySelector('.site-countdown');
    const stopClock = startCountdown(clock);
    cleanup = () => { stopClock(); clock.remove(); };
    main.innerHTML = `${bar({ home: true })}<section class="home"><a class="home-map-link" href="/travel-guide" aria-label="Explore the CONAMORE travel guide"><img class="home-map" src="${mapImage}" width="1024" height="1536" alt="The map of CONAMORE, with green hills, mountain roads, blue lakes and a golden desert." fetchpriority="high"></a><h1 class="wordmark"><a href="/travel-guide">CONAMORE</a></h1></section>`;
  } else if (path === '/travel-guide') {
    section = 'guide';
    document.title = 'Travel guide — CONAMORE';
    main.innerHTML = `${bar()}<div class="guide-page"><h1 class="sr-only">travel guide</h1>
      <button class="guide-background" aria-label="Show place names" aria-pressed="false" aria-controls="map-labels"></button>
      ${flowers()}
      ${directionsControls()}
      <section class="map-stage" aria-label="Explore the places of CONAMORE">
        <div class="map-canvas">
          <img class="map-image" src="${mapImage}" width="1024" height="1536" alt="CONAMORE travel map. Hover, focus or tap a location to find out more.">
          <svg class="route-overlay" viewBox="0 0 1024 1536" aria-hidden="true"></svg>
          ${places.filter(p => !p.area).map(p => `<button class="hotspot" style="--x:${p.x / 1024 * 100}%;--y:${p.y / 1536 * 100}%" data-place="${p.slug}" aria-label="${escape(p.name)}" aria-expanded="false" aria-controls="place-card"></button>`).join('')}
          <div id="map-labels" class="map-labels" aria-hidden="true" hidden>${places.filter(p => !p.area).map(mapLabel).join('')}</div>
        </div>
      </section></div>`;
    const guide = main.querySelector('.guide-page');
    const cleanLabels = setupMapLabels(guide);
    const directions = setupDirections(guide);
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
