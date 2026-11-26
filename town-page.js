import { places } from './places.js';

export const bySlug = new Map(places.map(place => [place.slug, place]));
export const mapImage = '/assets/conamore-map.png';
export const placeUrl = place => '/travel-guide/' + place.slug;
export const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);

export function bar({ home = false } = {}) {
  return `<header class="page-bar"><nav aria-label="Site navigation"><a href="/"${home ? ' aria-current="page"' : ''}>home</a><a href="https://desertformal.com">FORMAL</a><a href="https://strikeout.us">strikeout</a></nav></header>`;
}

export function renderTown(place) {
  const nearby = place.nearby.map(slug => bySlug.get(slug)).map(other =>
    `<a href="${placeUrl(other)}">${escape(other.name)} →</a>`).join('');
  return `${bar()}<a class="map-back" href="/travel-guide">← travel guide</a>
    <article class="detail">
      <div class="map-crop" style="--crop-x:${place.x / 1024 * 100}%;--crop-y:${place.y / 1536 * 100}%"><img src="${mapImage}" width="1024" height="1536" alt="${escape(place.name)} and its surroundings on the CONAMORE map"></div>
      <div class="detail-copy"><p class="eyebrow">${escape(place.region)}</p><h1>${escape(place.name)}</h1><p>${escape(place.detail)}</p>
        ${place.area ? '' : `<a class="detail-directions" href="/travel-guide?to=${place.slug}">Directions</a>`}
        <nav class="nearby" aria-label="Keep exploring"><h2>keep exploring</h2>${nearby}</nav>
      </div>
    </article>`;
}
