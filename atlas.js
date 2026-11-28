import { towns } from './routes.js';
import { bar, escape, mapImage } from './town-page.js';
import { directionsControls } from './directions.js';

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

const homeDescription = 'The terrain of CONAMORE, with a dot for each town.';
const roadDescription = 'CONAMORE road map. Choose a town to explore or get directions.';
const transitDescription = 'CONAMORE rail and ferry map. Choose a town for departures and directions.';
const homeDots = towns.map(town => `<circle cx="${town.x}" cy="${town.y}" r="7"/>`).join('');
const homeActions = `<a class="home-map-link" href="/travel-guide" aria-label="Explore the CONAMORE travel guide"></a>
  <h1 class="wordmark"><a href="/travel-guide">CONAMORE</a></h1>`;
const guideTools = `<h1 class="sr-only">travel guide</h1>
  <button class="guide-background" aria-label="Show place names" aria-pressed="false" aria-controls="map-labels"></button>
  ${flowers()}${directionsControls()}`;
const guideActions = `${towns.map(p => `<button class="hotspot" style="--x:${p.x / 1024 * 100}%;--y:${p.y / 1536 * 100}%" data-place="${p.slug}" aria-label="${escape(p.name)}" aria-expanded="false" aria-controls="place-card"></button>`).join('')}
          <div id="map-labels" class="map-labels" aria-hidden="true" hidden>${towns.map(mapLabel).join('')}</div>`;

export function renderAtlas(home) {
  return `${bar({ home })}<div class="atlas-page ${home ? 'home' : 'guide-page'}" data-artwork="${home ? 'home' : 'road'}">
    <div class="atlas-tools">${home ? '' : guideTools}</div>
    <section class="map-stage" aria-label="Explore the places of CONAMORE">
      <div class="map-canvas">
        <div class="map-layer road-layer"${home ? ' hidden' : ''}>
          <img class="map-image" src="${mapImage}" width="1024" height="1536" alt="${roadDescription}" fetchpriority="${home ? 'low' : 'high'}">
          <svg class="route-overlay" viewBox="0 0 1024 1536" aria-hidden="true"></svg>
        </div>
        <div class="map-layer transit-layer"${home ? '' : ' hidden'}>
          <img class="map-image" src="/assets/conamore-transit-terrain.webp" width="1024" height="1536" alt="${home ? homeDescription : transitDescription}" fetchpriority="${home ? 'high' : 'low'}">
          <svg class="home-dots" viewBox="0 0 1024 1536" aria-hidden="true">${homeDots}</svg>
          <svg class="route-overlay" viewBox="0 0 1024 1536" aria-hidden="true"></svg>
        </div>
        <div class="atlas-actions">${home ? homeActions : guideActions}</div>
      </div>
    </section></div>`;
}

// Change the controls around the atlas without detaching either image or its canvas.
export function mountAtlas(main, home) {
  const page = main.querySelector('.atlas-page');
  if (!page) {
    main.innerHTML = renderAtlas(home);
    return main.querySelector('.atlas-page');
  }
  const view = home ? 'home' : 'guide-page';
  if (!home || !page.classList.contains(view)) {
    page.className = 'atlas-page ' + view;
    page.querySelector('.atlas-tools').innerHTML = home ? '' : guideTools;
    page.querySelector('.atlas-actions').innerHTML = home ? homeActions : guideActions;
    page.querySelector('.transit-layer img').alt = home ? homeDescription : transitDescription;
    const homeLink = main.querySelector('.page-bar a[href="/"]');
    if (home) homeLink.setAttribute('aria-current', 'page');
    else homeLink.removeAttribute('aria-current');
  }
  return page;
}
