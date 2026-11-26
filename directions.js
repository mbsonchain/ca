import { findRoute, names, roads, towns } from './routes.js';
import { postedClosures } from './road-network.js';

const byTown = new Map(towns.map(place => [place.slug, place]));
const byRoad = new Map(roads.map(road => [road.id, road]));
const townOptions = [...towns].sort((a,b) => a.name.localeCompare(b.name))
  .map(place => `<option value="${place.slug}">${place.name}</option>`).join('');
const roadName = road => `${names.get(road.from)} – ${names.get(road.to)}${road.variant ? ' · ' + road.variant : ''}${road.mode === 'ferry' ? ' · ferry' : ''}`;
const sortedRoads = [...roads].sort((a,b) => roadName(a).localeCompare(roadName(b)));

export function directionsControls() {
  return `<div class="directions">
    <button type="button" class="directions-toggle" aria-expanded="false" aria-controls="directions-panel">directions</button>
    <span class="pick-prompt" role="status"></span>
    <section id="directions-panel" aria-label="Directions" hidden>
      <label>From<select name="from"><option value="">Choose a place</option>${townOptions}</select></label>
      <label>To<select name="to"><option value="">Choose a place</option>${townOptions}</select></label>
      <button type="button" data-pick class="text-action">Pick on map</button>
      <details class="road-closures"><summary>Road closures<span data-count></span></summary>
        <label>Close a segment for this trip<select name="close"><option value="">Choose a road or ferry</option></select></label>
        <ul class="closure-list"></ul>
      </details>
      <p class="route-status" role="status"></p>
      <details class="route-itinerary" hidden><summary>Itinerary</summary><ol></ol></details>
      <div class="route-actions"><button type="button" data-view hidden>View on map</button><button type="button" data-clear class="text-action" hidden>Clear route</button></div>
    </section>
  </div>`;
}

export function setupDirections(page) {
  const box = page.querySelector('.directions');
  const panel = box.querySelector('#directions-panel');
  const toggle = box.querySelector('.directions-toggle');
  const prompt = box.querySelector('.pick-prompt');
  const origin = box.querySelector('[name=from]');
  const destination = box.querySelector('[name=to]');
  const closeSelect = box.querySelector('[name=close]');
  const closureList = box.querySelector('.closure-list');
  const status = box.querySelector('.route-status');
  const itinerary = box.querySelector('.route-itinerary');
  const view = box.querySelector('[data-view]');
  const clear = box.querySelector('[data-clear]');
  const layer = page.querySelector('.route-overlay');
  const controller = new AbortController();
  const on = (el, event, callback) => el.addEventListener(event, callback, {signal: controller.signal});
  const params = new URLSearchParams(location.search);
  origin.value = byTown.has(params.get('from')) ? params.get('from') : '';
  destination.value = byTown.has(params.get('to')) ? params.get('to') : '';
  const temporary = new Set((params.get('closed') || '').split(',').filter(id => byRoad.has(id) && !postedClosures.has(id)));
  let picking = '';

  function setPanel(open, focus = false) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'close directions' : picking ? 'cancel' : 'directions';
    if (focus) (open ? origin : toggle).focus({ preventScroll: true });
  }
  function setPicking(step) {
    picking = step;
    page.classList.toggle('picking-route', Boolean(step));
    page.dispatchEvent(new CustomEvent('route-picking', {detail: Boolean(step)}));
    prompt.textContent = step === 'from' ? 'Choose your starting point' : step === 'to' ? 'Choose your destination' : '';
  }
  function save() {
    const url = new URL(location.href);
    for (const [key, value] of [['from', origin.value], ['to', destination.value], ['closed', [...temporary].join(',')]]) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    history.replaceState(history.state, '', url);
  }
  function draw(route, closed) {
    const closures = [...closed].map(id => {
      const road = byRoad.get(id);
      const [x,y] = road.points[Math.floor(road.points.length / 2)];
      return `<polyline class="closed-line" points="${road.geometry}"/><g class="closed-mark" transform="translate(${x} ${y})"><circle r="12"/><path d="M-5 -5 5 5 M5 -5 -5 5"/></g>`;
    });
    const lines = (route || []).map(({road}) => `<polyline class="route-halo" points="${road.geometry}"/><polyline class="route-line ${road.mode}" points="${road.geometry}"/>`);
    const pins = [...new Set([origin.value,destination.value])].filter(Boolean).map(id => {
      const p = byTown.get(id);
      return `<circle class="route-pin" cx="${p.x}" cy="${p.y}" r="15"/>`;
    });
    layer.innerHTML = [...closures,...lines,...pins].join('');
  }
  function update() {
    const closed = new Set([...postedClosures.keys(), ...temporary]);
    const route = findRoute(origin.value, destination.value, closed);
    closeSelect.replaceChildren(new Option('Choose a road or ferry', ''));
    for (const road of sortedRoads) {
      if (!closed.has(road.id)) closeSelect.add(new Option(roadName(road), road.id));
    }
    closureList.replaceChildren();
    for (const id of closed) {
      const item = document.createElement('li');
      item.append(roadName(byRoad.get(id)));
      if (temporary.has(id)) {
        const reopen = document.createElement('button');
        reopen.className = 'text-action';
        reopen.type = 'button';
        reopen.textContent = 'Reopen';
        reopen.setAttribute('aria-label', 'Reopen ' + roadName(byRoad.get(id)));
        reopen.dataset.reopen = id;
        item.append(' ', reopen);
      } else item.append(' · ' + postedClosures.get(id));
      closureList.append(item);
    }
    box.querySelector('[data-count]').textContent = closed.size ? ` (${closed.size})` : '';
    let message = '';
    if (origin.value && destination.value) {
      if (route === null) message = 'No route is open between these places with the current closures.';
      else if (!route.length) message = 'You’re already at your destination.';
      else {
        const ferries = route.filter(leg => leg.road.mode === 'ferry').length;
        message = ferries ? `Route includes ${ferries} ferry ${ferries === 1 ? 'crossing' : 'crossings'}.` : 'Route by road.';
      }
    }
    status.textContent = message;
    itinerary.hidden = !route?.length;
    itinerary.querySelector('ol').replaceChildren(...(route || []).map(({from,to,road}) => {
      const item = document.createElement('li');
      item.textContent = `${road.mode === 'ferry' ? 'Ferry' : 'Road'} · ${names.get(from)} to ${names.get(to)}${road.variant ? ' (' + road.variant.toLowerCase() + ')' : ''}`;
      return item;
    }));
    view.hidden = !route?.length;
    clear.hidden = !origin.value && !destination.value;
    draw(route, closed);
    return route;
  }
  function commit() { save(); update(); }
  on(toggle, 'click', () => {
    if (picking) { setPicking(''); setPanel(true, true); }
    else setPanel(panel.hidden, panel.hidden);
  });
  on(origin, 'change', commit);
  on(destination, 'change', commit);
  on(closeSelect, 'change', () => {
    if (!byRoad.has(closeSelect.value)) return;
    temporary.add(closeSelect.value);
    commit();
  });
  on(closureList, 'click', event => {
    const button = event.target.closest('[data-reopen]');
    if (!button) return;
    temporary.delete(button.dataset.reopen);
    commit();
    closeSelect.focus();
  });
  on(clear, 'click', () => {
    origin.value = ''; destination.value = '';
    commit();
    origin.focus();
  });
  on(view, 'click', () => setPanel(false, true));
  on(box.querySelector('[data-pick]'), 'click', () => {
    setPicking('from');
    setPanel(false, true);
  });
  on(page.ownerDocument, 'keydown', event => {
    if (event.key !== 'Escape' || (!picking && panel.hidden)) return;
    if (picking) { setPicking(''); setPanel(true, true); }
    else setPanel(false, true);
    event.preventDefault();
  });
  const initialRoute = update();
  setPanel(Boolean(origin.value || destination.value) && !initialRoute?.length);
  return {
    isPicking: () => Boolean(picking),
    pick(slug) {
      if (!picking || !byTown.has(slug)) return false;
      if (picking === 'from') {
        origin.value = slug; destination.value = '';
        setPicking('to');
      } else {
        destination.value = slug;
        setPicking('');
        setPanel(true);
        toggle.focus({preventScroll:true});
      }
      commit();
      return true;
    },
    dispose: () => controller.abort(),
  };
}
