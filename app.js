import { places } from './places.js';
import { collectionIntroduction, interviewArticle, interviewPath } from './collection.js';
import { renderArticle } from './article.js';
import { setupMapLabels } from './map-labels.js';
import { setupCards } from './place-cards.js';

const main = document.querySelector('#main');
const bySlug = new Map(places.map(place => [place.slug, place]));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const placeUrl = place => `/travel-guide/${place.slug}`;
const mapImage = '/assets/conamore-map.png';
let cleanup = () => {};

function mapLabel(place) {
  const left = ['orangepoint', 'freetown', 'open-city'].includes(place.slug);
  const name = ['freetown-formal', 'island-formal', 'sunset-cliffs'].includes(place.slug) ? escape(place.name).replace(' ', '<br>') : escape(place.name);
  const drop = { laketown: 6, santamore: 9, orangepoint: -9 }[place.slug] || 0;
  return `<span class="map-label" data-label="${place.slug}" data-x="${place.x}" data-side="${left ? 'left' : 'right'}" style="top:calc(${place.y / 1536 * 100}% + ${drop}px)">${name}</span>`;
}

function bar({ home = false } = {}) {
  return `<header class="page-bar${home ? ' home-bar' : ''}"><nav aria-label="Site navigation"><a href="/"${home ? ' aria-current="page"' : ''}>home</a><a href="https://desertformal.com">formal</a><a href="https://strikeout.us">strikeout</a></nav></header>`;
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

function setupMobileFlowers(collection) {
  const layer = collection.querySelector('.mobile-flowers');
  const article = collection.querySelector('.collection-content');
  let active = true;
  const arrange = () => {
    if (!active) return;
    if (!window.matchMedia('(max-width: 899px)').matches) {
      layer.replaceChildren();
      return;
    }
    const bounds = collection.getBoundingClientRect();
    const logo = collection.querySelector('.collection-wordmark a').getBoundingClientRect();
    const text = article.getBoundingClientRect();
    const positions = [{ x: Math.min(logo.right - bounds.left + 5, bounds.width - 18), y: logo.bottom - bounds.top - 4, rotation: 12 }];
    const breaks = [...article.querySelectorAll('h1, h2, p')].map(element => element.getBoundingClientRect());
    const horizontal = [.78, .18, .62, .36, .86, .12];
    const rotations = [-8, 12, -16, 9, 18, -6];
    let previousY = positions[0].y;
    let placed = 0;
    for (let index = 0; index < breaks.length - 1; index++) {
      const gap = breaks[index + 1].top - breaks[index].bottom;
      const y = breaks[index].bottom - bounds.top + gap / 2;
      // Use existing pauses in the text, leaving at least 180px between accents.
      if (gap < 16 || y - previousY < 180) continue;
      positions.push({ x: text.left - bounds.left + text.width * horizontal[placed % horizontal.length], y, rotation: rotations[placed % rotations.length] });
      previousY = y;
      placed++;
    }
    if (article.classList.contains('collection-introduction')) {
      for (const [index, offset] of [[1, 8], [3, 4], [4, 8], [5, 8]]) {
        if (positions[index]) positions[index].y -= offset;
      }
      positions.push({ x: text.left - bounds.left + text.width / 2, y: text.bottom - bounds.top + 32, rotation: -8 });
    }
    layer.innerHTML = positions.map(({ x, y, rotation }) => `<img src="/assets/conamore-flower.png" width="583" height="618" alt="" draggable="false" style="left:${x}px;top:${y}px;--flower-rotation:${rotation}deg">`).join('');
  };
  const observer = new ResizeObserver(arrange);
  observer.observe(collection);
  document.fonts.ready.then(arrange);
  return () => { active = false; observer.disconnect(); };
}

function desktopFlowerColumn() {
  const images = [1, 2, 3, 4, 5].map(number => `<img src="/assets/conamore-flower-sketch-${number}.svg" alt="" draggable="false">`).join('');
  return ['left', 'right'].map(side => `<div class="desktop-flower-column desktop-flower-column--${side}" aria-hidden="true">${images}</div>`).join('');
}

function render({ focus = false } = {}) {
  cleanup();
  cleanup = () => {};
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.body.classList.toggle('fixed-map-page', ['/', '/travel-guide'].includes(path));
  document.body.classList.toggle('collection-page', path === '/visit-conamore' || path === interviewPath);
  document.body.classList.toggle('collection-landing-page', path === '/visit-conamore');
  let section = '';
  if (path === '/') {
    document.title = 'CONAMORE';
    main.innerHTML = `${bar({ home: true })}<section class="home"><a class="home-map-link" href="/travel-guide" aria-label="Explore the CONAMORE travel guide"><img class="home-map" src="${mapImage}" width="1024" height="1536" alt="The map of CONAMORE, with green hills, mountain roads, blue lakes and a golden desert." fetchpriority="high"></a><h1 class="wordmark"><a href="/travel-guide">CONAMORE</a></h1></section>`;
  } else if (path === '/travel-guide') {
    section = 'guide';
    document.title = 'Travel guide — CONAMORE';
    main.innerHTML = `${bar()}<div class="guide-page"><h1 class="sr-only">travel guide</h1>
      <button class="guide-background" aria-label="Show place names" aria-pressed="false" aria-controls="map-labels"></button>
      ${flowers()}
      <section class="map-stage" aria-label="Explore the places of CONAMORE">
        <div class="map-canvas">
          <img class="map-image" src="${mapImage}" width="1024" height="1536" alt="CONAMORE travel map. Hover, focus or tap a location to find out more.">
          ${places.map(p => `<button class="hotspot${p.area ? ' area' : ''}" style="--x:${p.x / 1024 * 100}%;--y:${p.y / 1536 * 100}%" data-place="${p.slug}" aria-label="${escape(p.name)}" aria-expanded="false" aria-controls="place-card"></button>`).join('')}
          <div id="map-labels" class="map-labels" aria-hidden="true" hidden>${places.map(mapLabel).join('')}</div>
        </div>
      </section></div>`;
    cleanup = setupCards(main, button => {
      const p = bySlug.get(button.dataset.place);
      return { title: p.name, intro: p.intro, eyebrow: p.region, url: placeUrl(p), link: 'explore this place →' };
    }, navigate);
    const cleanCards = cleanup;
    const cleanLabels = setupMapLabels(document.querySelector('.guide-page'));
    cleanup = () => { cleanCards(); cleanLabels(); };
  } else if (path.startsWith('/travel-guide/') && bySlug.has(path.split('/')[2]) && path.split('/').length === 3) {
    section = 'guide';
    const place = bySlug.get(path.split('/')[2]);
    document.title = `${place.name} — CONAMORE`;
    main.innerHTML = `${bar()}<a class="map-back" href="/travel-guide">← travel guide</a>
      <article class="detail">
        <div class="map-crop" style="--crop-x:${place.x / 1024 * 100}%;--crop-y:${place.y / 1536 * 100}%"><img src="${mapImage}" width="1024" height="1536" alt="${escape(place.name)} and its surroundings on the CONAMORE map"></div>
        <div class="detail-copy"><p class="eyebrow">${escape(place.region)}</p><h1>${escape(place.name)}</h1><p>${escape(place.detail)}</p>
          <nav class="nearby" aria-label="Keep exploring"><h2>keep exploring</h2>${place.nearby.map(slug => `<a href="${placeUrl(bySlug.get(slug))}">${escape(bySlug.get(slug).name)} →</a>`).join('')}</nav>
        </div>
      </article>`;
  } else if (path === '/visit-conamore') {
    section = 'collection';
    document.title = 'Visit CONAMORE';
    main.innerHTML = `${bar()}<section class="collection" aria-label="Visit CONAMORE">
      <h1 class="collection-wordmark"><a href="/" aria-label="CONAMORE — home">CONAMORE</a></h1>
      <article class="collection-content collection-introduction" aria-label="About the collection">
        ${collectionIntroduction.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}
        <p class="interview-invitation">Read the full interview <a href="${interviewPath}" aria-label="Read the full interview: CONAMORE is a place">here</a>.</p>
      </article>
      <div class="mobile-flowers" aria-hidden="true"></div>
      ${desktopFlowerColumn()}
    </section>`;
  } else if (path === interviewPath) {
    section = 'collection';
    document.title = `${interviewArticle.title} — CONAMORE`;
    main.innerHTML = `${bar()}<section class="collection" aria-label="Visit CONAMORE">
      <p class="collection-wordmark"><a href="/" aria-label="CONAMORE — home">CONAMORE</a></p>
      <article class="collection-content interview-content" aria-label="${escape(interviewArticle.title)}">
        ${renderArticle(interviewArticle, { titleLevel: 1, highlightQuestions: false })}
        <p class="interview-return"><a href="/visit-conamore">← visit CONAMORE</a></p>
      </article>
      <div class="mobile-flowers" aria-hidden="true"></div>
    </section>`;
  } else {
    document.title = 'Not found — CONAMORE';
    main.innerHTML = `${bar()}<section class="not-found"><h1>off the map.</h1><p><a href="/travel-guide">back to the travel guide →</a></p></section>`;
  }
  if (section === 'collection') cleanup = setupMobileFlowers(main.querySelector('.collection'));
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
render();
