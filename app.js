import { places } from './places.js';
import { collectionArticle } from './collection.js';
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

function flowers({ linked = false } = {}) {
  const flower = position => {
    const image = '<img src="/assets/conamore-flower.png" width="583" height="618" alt="" draggable="false">';
    const className = `side-flower side-flower--${position}`;
    return linked
      ? `<a class="${className}" href="/visit-conamore" aria-label="Visit Conamore">${image}</a>`
      : `<span class="${className}">${image}</span>`;
  };
  return `<div class="side-flowers ${linked ? 'guide-flowers' : 'collection-flowers'}"${linked ? '' : ' aria-hidden="true"'}>
    <div class="flower-side flower-side--left">${flower('one')}${flower('two')}</div>
    <div class="flower-side flower-side--right">${flower('three')}${flower('four')}</div>
  </div>`;
}

function render({ focus = false } = {}) {
  cleanup();
  cleanup = () => {};
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.body.classList.toggle('fixed-map-page', ['/', '/travel-guide', '/visit-conamore'].includes(path));
  document.body.classList.toggle('collection-page', path === '/visit-conamore');
  let section = '';
  if (path === '/') {
    document.title = 'Conamore';
    main.innerHTML = `${bar({ home: true })}<section class="home"><a class="home-map-link" href="/travel-guide" aria-label="Explore the Conamore travel guide"><img class="home-map" src="${mapImage}" width="1024" height="1536" alt="The map of Conamore, with green hills, mountain roads, blue lakes and a golden desert." fetchpriority="high"></a><h1 class="wordmark"><a href="/travel-guide">CONAMORE</a></h1></section>`;
  } else if (path === '/travel-guide') {
    section = 'guide';
    document.title = 'Travel guide — Conamore';
    main.innerHTML = `${bar()}<div class="guide-page"><h1 class="sr-only">travel guide</h1>
      <button class="guide-background" aria-label="Show place names" aria-pressed="false" aria-controls="map-labels"></button>
      ${flowers({ linked: true })}
      <section class="map-stage" aria-label="Explore the places of Conamore">
        <div class="map-canvas">
          <img class="map-image" src="${mapImage}" width="1024" height="1536" alt="Conamore travel map. Hover, focus or tap a location to find out more.">
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
    document.title = `${place.name} — Conamore`;
    main.innerHTML = `${bar()}<a class="map-back" href="/travel-guide">← travel guide</a>
      <article class="detail">
        <div class="map-crop" style="--crop-x:${place.x / 1024 * 100}%;--crop-y:${place.y / 1536 * 100}%"><img src="${mapImage}" width="1024" height="1536" alt="${escape(place.name)} and its surroundings on the Conamore map"></div>
        <div class="detail-copy"><p class="eyebrow">${escape(place.region)}</p><h1>${escape(place.name)}</h1><p>${escape(place.detail)}</p>
          <nav class="nearby" aria-label="Keep exploring"><h2>keep exploring</h2>${place.nearby.map(slug => `<a href="${placeUrl(bySlug.get(slug))}">${escape(bySlug.get(slug).name)} →</a>`).join('')}</nav>
        </div>
      </article>`;
  } else if (path === '/visit-conamore') {
    section = 'collection';
    document.title = 'Visit Conamore';
    main.innerHTML = `${bar()}<section class="collection" aria-label="Visit Conamore">
      ${flowers()}
      <h1 class="collection-wordmark"><a href="/" aria-label="Conamore — home">CONAMORE</a></h1>
      <article class="collection-content" tabindex="0" aria-label="${escape(collectionArticle.title || 'About the collection')}">
        ${renderArticle(collectionArticle)}
      </article>
    </section>`;
  } else {
    document.title = 'Not found — Conamore';
    main.innerHTML = `${bar()}<section class="not-found"><h1>off the map.</h1><p><a href="/travel-guide">back to the travel guide →</a></p></section>`;
  }
  document.querySelectorAll('[data-nav]').forEach(a => {
    if (a.dataset.nav === section) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (focus) main.focus({ preventScroll: true });
}

function navigate(url) {
  history.replaceState({ ...history.state, scroll: scrollY, articleScroll: document.querySelector('.collection-content')?.scrollTop || 0 }, '', location.href);
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
  const article = document.querySelector('.collection-content');
  if (article) article.scrollTop = history.state?.articleScroll || 0;
});
history.scrollRestoration = 'manual';
render();
