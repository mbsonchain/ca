import { names, planTrip, roads, towns } from './routes.js';
import { postedClosures } from './road-network.js';
import { serviceTime } from './transit.js';
import { mapOverlay, routeResult, stationInfo, updateMarkup } from './directions-view.js';
import { escape } from './town-page.js';

const ordered = [...towns].sort((a, b) => a.name.localeCompare(b.name));
const ids = new Set(towns.map(town => town.slug));
const prompts = { from: 'choose starting point', to: 'where to?' };
const options = ordered.map((town, index) =>
  `<li role="option" aria-selected="false" data-town="${town.slug}" data-index="${index}">${escape(town.name)}</li>`).join('');

function field(key) {
  return `<div class="trip-field" data-field="${key}"><span class="field-dot" aria-hidden="true"></span>
    <button type="button" role="combobox" class="town-picker" data-picker="${key}" aria-haspopup="listbox"
      aria-controls="choices-${key}" aria-expanded="false" aria-label="${prompts[key]}">
      <span class="picker-value">${prompts[key]}</span><i aria-hidden="true"></i></button>
    <button type="button" class="field-clear" data-clear="${key}" aria-label="Clear ${key === 'from' ? 'starting point' : 'destination'}" hidden>×</button>
    <ul class="town-choices" role="listbox" aria-label="${prompts[key]}" id="choices-${key}" hidden>${options}</ul></div>`;
}

export function directionsControls() {
  return `<div class="map-tools"><div class="map-modes" role="group" aria-label="Travel mode">
    <button type="button" data-mode="road" aria-pressed="true">Road</button>
    <button type="button" data-mode="transit" aria-pressed="false">Rail &amp; ferry</button>
    </div><div class="network-key" hidden><span>Train</span><span>Ferry</span><span>In progress</span></div></div>
    <section class="trip-sheet" aria-label="Directions" hidden>
      <div class="sheet-bar"><button type="button" class="sheet-handle" aria-expanded="true" aria-controls="trip-body"><span>Directions</span><i aria-hidden="true"></i></button>
        <button type="button" class="sheet-close" aria-label="Close directions">×</button></div>
      <div id="trip-body"><div class="trip-endpoints">${field('from')}${field('to')}</div><div class="trip-result" aria-live="polite"></div></div>
    </section>`;
}

export function setupMapArtwork(page) {
  const layers = { road: page.querySelector('.road-layer'), transit: page.querySelector('.transit-layer') };
  const controller = new AbortController();
  const ready = new Set();
  let requested = 'road';

  function reveal(mode) {
    if (controller.signal.aborted || mode !== requested) return;
    layers[mode].hidden = false;
    layers[mode === 'road' ? 'transit' : 'road'].hidden = true;
  }

  for (const [mode, layer] of Object.entries(layers)) {
    const image = layer.querySelector('img');
    async function prepare() {
      if (!image.naturalWidth) return;
      try {
        await image.decode?.();
      } catch {
        return;
      }
      ready.add(mode);
      reveal(mode);
    }
    if (image.complete && image.naturalWidth) prepare();
    else image.addEventListener('load', prepare, { once: true, signal: controller.signal });
  }

  return {
    layers,
    show(mode) {
      requested = mode;
      if (ready.has(mode)) reveal(mode);
    },
    dispose() { controller.abort(); },
  };
}

export function setupDirections(page, artwork) {
  const sheet = page.querySelector('.trip-sheet'), body = sheet.querySelector('#trip-body');
  const handle = sheet.querySelector('.sheet-handle'), result = sheet.querySelector('.trip-result');
  const key = page.querySelector('.network-key');
  const controls = [...page.querySelectorAll('[data-mode]')];
  const mapButtons = page.querySelectorAll('.hotspot, .guide-background');
  const pickers = Object.fromEntries([...sheet.querySelectorAll('[data-picker]')].map(button => [button.dataset.picker, button]));
  const lists = Object.fromEntries(Object.keys(pickers).map(k => [k, sheet.querySelector('#choices-' + k)]));
  const params = new URLSearchParams(location.search);
  let mode = params.get('mode') === 'transit' ? 'transit' : 'road';
  const selected = Object.fromEntries(Object.keys(pickers).map(k => [k, ids.has(params.get(k)) ? params.get(k) : '']));
  const extra = new Set((params.get('closed') || '').split(',').filter(id => !postedClosures.has(id) && roads.some(edge => edge.id === id)));
  const controller = new AbortController();
  const on = (el, type, callback) => el.addEventListener(type, callback, { signal: controller.signal });
  let listKey = '', highlight = -1, restoreFocus, timer;
  let now = serviceTime();

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
    key.hidden = mode !== 'transit';
    const overlay = artwork.layers[mode].querySelector('.route-overlay');
    const map = mapOverlay(mode, from, to, route?.legs, extra);
    if (overlay._rendered !== map) { overlay.innerHTML = map; overlay._rendered = map; }
    artwork.show(mode);
    handle.querySelector('span').textContent = body.hidden ? [names.get(from), names.get(to)].filter(Boolean).join(' → ') || 'Directions' : 'Directions';
    if (!sheet.hidden) updateMarkup(result, routeResult(from, to, mode, route, now, extra));
  }
  function closeChoices() {
    if (!listKey) return;
    lists[listKey].hidden = true;
    pickers[listKey].setAttribute('aria-expanded', 'false');
    pickers[listKey].removeAttribute('aria-activedescendant');
    if (highlight >= 0) lists[listKey].children[highlight].classList.remove('highlight');
    listKey = ''; highlight = -1;
  }
  function highlightOption(index) {
    const rows = lists[listKey].children;
    if (highlight >= 0) rows[highlight].classList.remove('highlight');
    highlight = index;
    if (index < 0) return;
    const row = rows[index];
    row.classList.add('highlight');
    pickers[listKey].setAttribute('aria-activedescendant', row.id);
    row.scrollIntoView({ block: 'nearest' });
  }
  function showChoices(k) {
    closeChoices();
    listKey = k;
    lists[k].hidden = false;
    pickers[k].setAttribute('aria-expanded', 'true');
    lists[k].scrollTop = 0;
    highlightOption(ordered.findIndex(town => town.slug === selected[k]));
  }
  function syncField(k) {
    const text = names.get(selected[k]) || prompts[k];
    pickers[k].querySelector('.picker-value').textContent = text;
    pickers[k].setAttribute('aria-label', selected[k] ? prompts[k] + ', ' + text : prompts[k]);
    for (const row of lists[k].children) row.setAttribute('aria-selected', String(row.dataset.town === selected[k]));
    sheet.querySelector('[data-clear="' + k + '"]').hidden = !selected[k];
  }
  function choose(k, slug) {
    if (!ids.has(slug)) return;
    selected[k] = slug;
    syncField(k); closeChoices();
    pickers[k].focus({ preventScroll: true });
    save(); draw();
  }
  function setOpen(open) {
    sheet.hidden = !open;
    for (const button of mapButtons) button.disabled = open;
    page.dispatchEvent(new CustomEvent('directions-open', { detail: open }));
  }
  function setExpanded(expanded) {
    body.hidden = !expanded;
    handle.setAttribute('aria-expanded', String(expanded));
    closeChoices();
    if (expanded && (!selected.from || !selected.to)) showChoices(selected.from ? 'to' : 'from');
    draw();
  }
  function openTo(slug, focusMarker) {
    if (!sheet.hidden) return;
    restoreFocus = focusMarker;
    selected.to = slug;
    for (const k of Object.keys(pickers)) syncField(k);
    setOpen(true);
    save(); setExpanded(true);
    (listKey ? pickers[listKey] : handle).focus({ preventScroll: true });
  }
  function closeSheet() {
    closeChoices();
    setOpen(false);
    selected.from = ''; selected.to = '';
    for (const k of Object.keys(pickers)) syncField(k);
    save(); draw();
    if (restoreFocus) restoreFocus();
    else controls.find(button => button.dataset.mode === mode).focus({ preventScroll: true });
    restoreFocus = null;
  }
  for (const button of controls) on(button, 'click', () => {
    mode = button.dataset.mode;
    save(); draw();
  });
  let dragStart, skipHandleClick = false;
  function resetDrag() {
    dragStart = null;
    sheet.style.removeProperty('--sheet-drag');
    sheet.classList.remove('is-dragging');
  }
  on(handle, 'pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    skipHandleClick = false;
    dragStart = { id: event.pointerId, y: event.clientY };
    handle.setPointerCapture(event.pointerId);
  });
  on(handle, 'pointermove', event => {
    if (dragStart?.id !== event.pointerId) return;
    const dy = event.clientY - dragStart.y;
    if (dy > 4) sheet.classList.add('is-dragging');
    sheet.style.setProperty('--sheet-drag', Math.max(0, dy) + 'px');
  });
  on(handle, 'pointerup', event => {
    if (dragStart?.id !== event.pointerId) return;
    const dy = event.clientY - dragStart.y;
    resetDrag();
    if (Math.abs(dy) < 36) return;
    skipHandleClick = true;
    if (dy > 0 && body.hidden) closeSheet();
    else if (dy > 0 || body.hidden) setExpanded(dy < 0);
  });
  on(handle, 'lostpointercapture', resetDrag);
  on(handle, 'pointercancel', resetDrag);
  on(handle, 'click', event => {
    if (!skipHandleClick || event.detail === 0) setExpanded(body.hidden);
    skipHandleClick = false;
  });
  on(sheet.querySelector('.sheet-close'), 'click', closeSheet);
  for (const [k, picker] of Object.entries(pickers)) {
    for (const row of lists[k].children) row.id = 'choice-' + k + '-' + row.dataset.index;
    syncField(k);
    on(picker, 'click', () => { if (listKey === k) closeChoices(); else showChoices(k); });
    on(picker, 'keydown', event => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (listKey !== k) showChoices(k);
        const last = ordered.length - 1;
        const next = { ArrowDown: Math.min(highlight + 1, last), ArrowUp: highlight < 0 ? last : Math.max(highlight - 1, 0), Home: 0, End: last };
        highlightOption(next[event.key]);
      } else if (listKey === k && ['Enter', ' '].includes(event.key) && highlight >= 0) {
        event.preventDefault(); choose(k, ordered[highlight].slug);
      } else if (listKey === k && event.key === 'Escape') {
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
      picker.focus({ preventScroll: true }); showChoices(k);
    });
  }
  on(document, 'pointerdown', event => {
    if (listKey && !pickers[listKey].closest('.trip-field').contains(event.target)) closeChoices();
  });
  on(document, 'keydown', event => {
    if (event.key === 'Escape' && !event.defaultPrevented && !sheet.hidden) {
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
  if (selected.from || selected.to) { setOpen(true); setExpanded(true); }
  refresh();
  return {
    openTo, isOpen: () => !sheet.hidden,
    station: slug => stationInfo(slug, now),
    onRefresh: fn => on(page, 'timetable-update', fn),
    dispose() { clearTimeout(timer); controller.abort(); },
  };
}
