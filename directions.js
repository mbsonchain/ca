import { names, planTrip, roads, towns } from './routes.js';
import { postedClosures } from './road-network.js';
import { serviceTime } from './transit.js';
import { mapOverlay, routeResult, stationInfo, updateMarkup } from './directions-view.js';
import { escape } from './town-page.js';

const ordered = [...towns].sort((a, b) => a.name.localeCompare(b.name));
const ids = new Set(towns.map(town => town.slug));
const prompts = { from: 'choose starting point', to: 'where to?' };
const normalize = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');

function field(key) {
  return `<div class="trip-field" data-field="${key}"><span class="field-dot" aria-hidden="true"></span>
    <input role="combobox" name="${key}" autocomplete="off" autocapitalize="words" spellcheck="false"
      aria-autocomplete="list" aria-controls="choices-${key}" aria-expanded="false" aria-label="${prompts[key]}" placeholder="${prompts[key]}">
    <button type="button" class="field-clear" data-clear="${key}" aria-label="Clear ${key === 'from' ? 'starting point' : 'destination'}" hidden>×</button>
    <ul class="town-choices" role="listbox" aria-label="Town suggestions" id="choices-${key}" hidden></ul></div>`;
}

export function directionsControls() {
  return `<link rel="stylesheet" href="/assets/transit-map.css">
    <div class="map-tools"><div class="map-modes" role="group" aria-label="Travel mode">
    <button type="button" data-mode="road" aria-pressed="true">Road</button>
    <button type="button" data-mode="transit" aria-pressed="false">Rail &amp; ferry</button>
    </div><div class="network-key" hidden><span>Train</span><span>Ferry</span><span>In progress</span></div></div>
    <section class="trip-sheet" aria-label="Directions" hidden>
      <div class="sheet-bar"><button type="button" class="sheet-handle" aria-expanded="true" aria-controls="trip-body"><span>Directions</span><i aria-hidden="true"></i></button>
        <button type="button" class="sheet-close" aria-label="Close directions">×</button></div>
      <div id="trip-body">${field('from')}${field('to')}<div class="trip-result" aria-live="polite"></div></div>
    </section>`;
}

export function setupMapArtwork(image, signal) {
  const roadSource = image.getAttribute('src');
  function reveal() {
    if (image.complete && image.naturalWidth && image.currentSrc === image.src) image.style.visibility = '';
  }
  image.addEventListener('load', reveal, { signal });
  return mode => {
    const transit = mode === 'transit';
    const source = transit ? '/assets/conamore-transit-terrain.webp' : roadSource;
    image.alt = transit ? 'CONAMORE rail and ferry map. Choose a town for departures and directions.'
      : 'CONAMORE road map. Choose a town to explore or get directions.';
    if (image.getAttribute('src') === source) return;
    image.style.visibility = 'hidden';
    image.src = source;
    reveal();
  };
}

export function setupDirections(page) {
  const sheet = page.querySelector('.trip-sheet'), body = sheet.querySelector('#trip-body');
  const handle = sheet.querySelector('.sheet-handle'), result = sheet.querySelector('.trip-result');
  const overlay = page.querySelector('.route-overlay'), key = page.querySelector('.network-key');
  const controls = [...page.querySelectorAll('[data-mode]')];
  const inputs = Object.fromEntries([...sheet.querySelectorAll('input')].map(input => [input.name, input]));
  const lists = Object.fromEntries([...sheet.querySelectorAll('[role=listbox]')].map(list => [list.closest('[data-field]').dataset.field, list]));
  const params = new URLSearchParams(location.search);
  let mode = params.get('mode') === 'transit' ? 'transit' : 'road';
  const selected = Object.fromEntries(Object.keys(inputs).map(k => [k, ids.has(params.get(k)) ? params.get(k) : '']));
  const extra = new Set((params.get('closed') || '').split(',').filter(id => !postedClosures.has(id) && roads.some(edge => edge.id === id)));
  const controller = new AbortController();
  const showMap = setupMapArtwork(page.querySelector('.map-image'), controller.signal);
  const on = (el, type, callback) => el.addEventListener(type, callback, { signal: controller.signal });
  let picking = '', listKey = '', options = [], highlight = -1, restoreFocus, timer;
  let now = serviceTime();

  function setPicking(k) {
    if (picking === k) return;
    picking = k;
    page.dispatchEvent(new CustomEvent('route-picking', { detail: Boolean(k) }));
  }
  function save() {
    const url = new URL(location.href);
    for (const [k, v] of Object.entries({ ...selected, mode: mode === 'transit' ? mode : '' })) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    history.replaceState(history.state, '', url);
  }
  function draw() {
    const { from, to } = selected;
    const route = from && to ? planTrip(from, to, mode, now.minute, extra) : null;
    for (const button of controls) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    showMap(mode);
    key.hidden = mode !== 'transit';
    const map = mapOverlay(mode, from, to, route?.legs, extra);
    if (overlay._rendered !== map) { overlay.innerHTML = map; overlay._rendered = map; }
    handle.querySelector('span').textContent = body.hidden ? [names.get(from), names.get(to)].filter(Boolean).join(' → ') || 'Directions' : 'Directions';
    if (!sheet.hidden) updateMarkup(result, routeResult(from, to, mode, route, now, extra));
  }
  function closeChoices() {
    if (listKey) {
      lists[listKey].hidden = true;
      inputs[listKey].setAttribute('aria-expanded', 'false');
      inputs[listKey].removeAttribute('aria-activedescendant');
    }
    listKey = ''; highlight = -1;
  }
  function showChoices(k) {
    closeChoices();
    listKey = k;
    const query = selected[k] ? '' : normalize(inputs[k].value);
    options = ordered.filter(town => normalize(town.name).includes(query));
    lists[k].innerHTML = options.map((t, i) => `<li id="choice-${k}-${i}" role="option" aria-selected="false" data-town="${t.slug}">${escape(t.name)}</li>`).join('') || '<li class="no-match" role="presentation">No matching town</li>';
    lists[k].hidden = false;
    inputs[k].setAttribute('aria-expanded', 'true');
    setPicking(k);
  }
  function syncField(k) {
    inputs[k].value = names.get(selected[k]) || '';
    sheet.querySelector('[data-clear="' + k + '"]').hidden = !inputs[k].value;
  }
  function choose(k, slug) {
    if (!ids.has(slug)) return;
    selected[k] = slug;
    syncField(k); closeChoices();
    setPicking(!selected.from ? 'from' : !selected.to ? 'to' : '');
    inputs[k].blur();
    save(); draw();
  }
  function setExpanded(expanded) {
    body.hidden = !expanded;
    handle.setAttribute('aria-expanded', String(expanded));
    closeChoices();
    setPicking(expanded ? (!selected.from ? 'from' : !selected.to ? 'to' : '') : '');
    draw();
  }
  function openTo(slug, focusMarker) {
    restoreFocus = focusMarker;
    selected.to = slug;
    for (const k of Object.keys(inputs)) syncField(k);
    sheet.hidden = false;
    save(); setExpanded(true);
    if (window.matchMedia('(pointer: fine)').matches) {
      const target = selected.from ? handle : inputs.from;
      target.focus({ preventScroll: true });
    }
  }
  function closeSheet() {
    closeChoices(); setPicking('');
    sheet.hidden = true;
    selected.from = ''; selected.to = '';
    for (const k of Object.keys(inputs)) syncField(k);
    save(); draw();
    if (restoreFocus) restoreFocus();
    else controls.find(button => button.dataset.mode === mode).focus({ preventScroll: true });
    restoreFocus = null;
  }
  for (const button of controls) on(button, 'click', () => {
    mode = button.dataset.mode;
    save(); draw();
  });
  on(handle, 'click', () => setExpanded(body.hidden));
  on(sheet.querySelector('.sheet-close'), 'click', closeSheet);
  for (const [k, input] of Object.entries(inputs)) {
    syncField(k);
    on(input, 'focus', () => { setPicking(k); if (selected[k]) input.select(); });
    on(input, 'click', () => showChoices(k));
    on(input, 'input', () => {
      selected[k] = '';
      sheet.querySelector('[data-clear="' + k + '"]').hidden = !input.value;
      showChoices(k); save(); draw();
    });
    on(input, 'blur', closeChoices);
    on(input, 'keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (listKey !== k) showChoices(k);
        if (!options.length) return;
        highlight = event.key === 'ArrowDown' ? (highlight + 1) % options.length : (highlight <= 0 ? options.length - 1 : highlight - 1);
        const rows = [...lists[k].querySelectorAll('[role=option]')];
        rows.forEach((row, i) => row.setAttribute('aria-selected', String(i === highlight)));
        input.setAttribute('aria-activedescendant', rows[highlight].id);
        rows[highlight].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (listKey !== k) showChoices(k);
        const town = options[highlight] || options.find(t => normalize(t.name) === normalize(input.value)) || options[0];
        if (town) choose(k, town.slug);
      } else if (event.key === 'Escape' && listKey) {
        event.preventDefault(); event.stopPropagation(); closeChoices();
      } else if (event.key === 'Tab') closeChoices();
    });
    on(lists[k], 'mousedown', event => event.preventDefault());
    on(lists[k], 'click', event => {
      const row = event.target.closest('[data-town]');
      if (row) choose(k, row.dataset.town);
    });
    on(sheet.querySelector('[data-clear="' + k + '"]'), 'click', () => {
      selected[k] = ''; syncField(k); save(); draw();
      input.focus({ preventScroll: true }); showChoices(k);
    });
  }
  on(document, 'keydown', event => {
    if (event.key === 'Escape' && !event.defaultPrevented && !sheet.hidden && !page.querySelector('.place-card:not([hidden])')) {
      event.preventDefault(); closeSheet();
    }
  });
  function refresh() {
    clearTimeout(timer);
    now = serviceTime();
    draw();
    page.dispatchEvent(new Event('timetable-update'));
    timer = setTimeout(refresh, 60000 - Date.now() % 60000 + 20);
  }
  on(document, 'visibilitychange', () => { if (!document.hidden) refresh(); });
  sheet.hidden = !selected.from && !selected.to;
  if (!sheet.hidden) setExpanded(true);
  refresh();
  return {
    openTo, isPicking: () => Boolean(picking),
    pick(slug) { if (!picking) return false; choose(picking, slug); return true; },
    prepareCard() { if (!sheet.hidden && !body.hidden) setExpanded(false); },
    station: slug => stationInfo(slug, now),
    onRefresh: fn => on(page, 'timetable-update', fn),
    dispose() { clearTimeout(timer); controller.abort(); },
  };
}
