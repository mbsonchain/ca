import { places } from './places.js';
import { collectionCopy } from './collection.js';
import { setupMapLabels } from './map-labels.js';

const main = document.querySelector('#main');
const bySlug = new Map(places.map(place => [place.slug, place]));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const placeUrl = place => `/travel-guide/${place.slug}`;
const mapImage = '/assets/conamore-map.png';
let cleanup = () => {};
let labelsVisible = false;

function mapLabel(place) {
  const left = ['orangepoint', 'freetown', 'open-city'].includes(place.slug);
  const name = ['freetown-formal', 'island-formal', 'sunset-cliffs'].includes(place.slug) ? escape(place.name).replace(' ', '<br>') : escape(place.name);
  const drop = { laketown: 6, santamore: 9, orangepoint: -9 }[place.slug] || 0;
  return `<span class="map-label" data-label="${place.slug}" data-x="${place.x}" data-side="${left ? 'left' : 'right'}" style="top:calc(${place.y / 1536 * 100}% + ${drop}px)">${name}</span>`;
}

function bar({ home = false } = {}) {
  return `<header class="page-bar${home ? ' home-bar' : ''}"><nav aria-label="Site navigation"><a href="/"${home ? ' aria-current="page"' : ''}>home</a><a href="https://desertformal.com">formal</a><a href="https://strikeout.us">strikeout</a></nav></header>`;
}

function render({ focus = false } = {}) {
  cleanup();
  cleanup = () => {};
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.body.classList.toggle('fixed-map-page', ['/', '/travel-guide', '/visit-conamore'].includes(path));
  let section = '';
  if (path === '/') {
    document.title = 'Conamore';
    main.innerHTML = `${bar({ home: true })}<section class="home"><a class="home-map-link" href="/travel-guide" aria-label="Explore the Conamore travel guide"><img class="home-map" src="${mapImage}" width="1024" height="1536" alt="The map of Conamore, with green hills, mountain roads, blue lakes and a golden desert." fetchpriority="high"></a><h1 class="wordmark"><a href="/travel-guide">CONAMORE</a></h1></section>`;
  } else if (path === '/travel-guide') {
    section = 'guide';
    document.title = 'Travel guide — Conamore';
    main.innerHTML = `${bar()}<div class="guide-page"><h1 class="sr-only">travel guide</h1>
      <button class="guide-background" aria-label="Show place names" aria-pressed="${labelsVisible}" aria-controls="map-labels"></button>
      <section class="map-stage" aria-label="Explore the places of Conamore">
        <div class="map-canvas">
          <img class="map-image" src="${mapImage}" width="1024" height="1536" alt="Conamore travel map. Hover, focus or tap a location to find out more.">
          ${places.map(p => `<button class="hotspot${p.area ? ' area' : ''}" style="--x:${p.x / 1024 * 100}%;--y:${p.y / 1536 * 100}%" data-place="${p.slug}" aria-label="${escape(p.name)}" aria-expanded="false" aria-controls="place-card"></button>`).join('')}
          <div id="map-labels" class="map-labels" aria-hidden="true" hidden>${places.map(mapLabel).join('')}</div>
        </div>
      </section></div>`;
    setupCards(button => {
      const p = bySlug.get(button.dataset.place);
      return { title: p.name, intro: p.intro, eyebrow: p.region, url: placeUrl(p), link: 'explore this place →' };
    });
    const cleanCards = cleanup;
    const cleanLabels = setupMapLabels(document.querySelector('.guide-page'), { visible: labelsVisible, onChange: visible => { labelsVisible = visible; } });
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
    document.title = 'Visit Conamore — the collection';
    main.innerHTML = `${bar()}<article class="collection"><div class="collection-content"><h1 class="collection-wordmark"><a href="/">CONAMORE</a></h1><div class="collection-copy">
      ${collectionCopy.split('\n\n').map((p, i) => `<p${i === 0 ? ' class="collection-intro"' : ''}>${escape(p)}</p>`).join('')}
      </div></div></article>`;
    fitCollection();
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

function fitCollection() {
  const frame = document.querySelector('.collection');
  const content = document.querySelector('.collection-content');
  let pendingFrame;
  let disposed = false;
  function fit() {
    if (disposed) return;
    const style = getComputedStyle(frame);
    const available = frame.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (available <= 0) return;
    const setScale = scale => content.style.setProperty('--collection-fit', String(scale));
    const fits = () => Math.max(content.scrollHeight, content.getBoundingClientRect().height) <= available - 1;
    setScale(1);
    if (fits()) return;
    // Keep every paragraph and use the largest type that fits the real viewport.
    let low = .25;
    let high = 1;
    for (let step = 0; step < 12; step++) {
      const scale = (low + high) / 2;
      setScale(scale);
      if (fits()) low = scale;
      else high = scale;
    }
    setScale(low);
  }
  function scheduleFit() {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(fit);
  }
  const observer = new ResizeObserver(scheduleFit);
  observer.observe(frame);
  document.fonts.ready.then(() => { if (!disposed) scheduleFit(); });
  fit();
  cleanup = () => { disposed = true; observer.disconnect(); cancelAnimationFrame(pendingFrame); };
}

function setupCards(getContent) {
  const card = document.createElement('aside');
  card.id = 'place-card';
  card.className = 'place-card';
  card.setAttribute('aria-label', 'Location preview');
  card.hidden = true;
  main.append(card);
  let active = null;
  let closeTimer;
  let lastPointer = '';
  let suppressedFocus = false;
  const controller = new AbortController();
  const on = (target, type, callback) => target.addEventListener(type, callback, { signal: controller.signal });
  const cancelClose = () => clearTimeout(closeTimer);
  function close({ restoreFocus = false } = {}) {
    cancelClose();
    const old = active;
    active?.setAttribute('aria-expanded', 'false');
    card.hidden = true;
    active = null;
    if (restoreFocus && old) {
      suppressedFocus = true;
      old.focus({ preventScroll: true });
      suppressedFocus = false;
    }
  }
  function scheduleClose() {
    cancelClose();
    closeTimer = setTimeout(() => {
      if (!card.contains(document.activeElement) && document.activeElement !== active) close();
    }, 220);
  }
  function position() {
    if (!active || card.hidden) return;
    const r = active.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const margin = 12;
    let left = r.right + 9;
    if (left + w > innerWidth - margin) left = r.left - w - 9;
    if (left < margin) left = Math.max(margin, Math.min(innerWidth - w - margin, r.left + r.width / 2 - w / 2));
    let top = r.top + r.height / 2 - h / 2;
    const footerTop = document.querySelector('.site-footer').getBoundingClientRect().top;
    if (innerWidth < 641) top = r.bottom + 8;
    if (top + h > footerTop - 8) top = r.top - h - 8;
    card.style.left = `${left}px`;
    card.style.top = `${Math.max(margin, Math.min(innerHeight - h - margin, top))}px`;
  }
  function show(button) {
    cancelClose();
    if (active !== button) {
      active?.setAttribute('aria-expanded', 'false');
      active = button;
      const item = getContent(button);
      card.innerHTML = `<button class="card-close" aria-label="Close preview">×</button><span class="eyebrow">${escape(item.eyebrow)}</span><h2>${escape(item.title)}</h2>${item.intro ? `<p>${escape(item.intro)}</p>` : ''}${item.url ? `<a href="${item.url}">${item.link}</a>` : ''}`;
      card.querySelector('.card-close').addEventListener('click', () => close({ restoreFocus: true }));
      // Put the preview immediately after the active marker for keyboard navigation.
      button.after(card);
    }
    button.setAttribute('aria-expanded', 'true');
    card.hidden = false;
    position();
  }
  main.querySelectorAll('.hotspot').forEach(button => {
    on(button, 'pointerenter', event => { if (event.pointerType === 'mouse') show(button); });
    on(button, 'pointerleave', scheduleClose);
    on(button, 'pointerdown', event => { lastPointer = event.pointerType; });
    on(button, 'focus', () => { if (!suppressedFocus) show(button); });
    on(button, 'blur', scheduleClose);
    on(button, 'click', event => {
      const item = getContent(button);
      if (lastPointer === 'mouse' && event.detail > 0 && item.url) navigate(item.url);
      else {
        show(button);
        if (event.detail === 0) (card.querySelector('a') || card.querySelector('button')).focus();
      }
      lastPointer = '';
    });
  });
  on(card, 'pointerenter', cancelClose);
  on(card, 'pointerleave', scheduleClose);
  on(card, 'focusin', cancelClose);
  on(card, 'focusout', scheduleClose);
  on(document, 'pointerdown', event => { if (!card.contains(event.target) && !event.target.closest('.hotspot')) close(); });
  on(document, 'keydown', event => { if (event.key === 'Escape' && !card.hidden) { event.preventDefault(); close({ restoreFocus: card.contains(document.activeElement) }); } });
  on(window, 'resize', position);
  on(window, 'scroll', position);
  cleanup = () => { cancelClose(); controller.abort(); card.remove(); };
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
window.addEventListener('popstate', () => { render({ focus: true }); window.scrollTo(0, history.state?.scroll || 0); });
history.scrollRestoration = 'manual';
render();
