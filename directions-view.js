import { names, roads, towns, itinerary } from './routes.js';
import { postedClosures } from './road-network.js';
import { lines, stationDepartures, clockTime, duration, dayMinutes } from './transit.js';
import { bySlug, escape } from './town-page.js';

const title = slug => escape(names.get(slug));
const label = mode => ({ road: 'Drive', train: 'Train', ferry: 'Ferry' })[mode];
const construction = lines.filter(edge => edge.status === 'in-progress');
const pair = (a, b, from, to) => (a === from && b === to) || (a === to && b === from);
const hasStation = slug => lines.some(edge => edge.status === 'running' && [edge.from, edge.to].includes(slug));

function destination(trip) {
  const via = trip.to === trip.terminus ? '' : ' via ' + title(trip.to);
  return title(trip.terminus) + via;
}

export function stationInfo(slug, now) {
  const upcoming = stationDepartures(slug, now.minute);
  const next = upcoming[0];
  let board = '';
  if (hasStation(slug)) {
    const groups = new Map();
    for (const trip of upcoming) {
      const heading = label(trip.edge.mode) + ' to ' + destination(trip);
      if (!groups.has(heading)) groups.set(heading, []);
      groups.get(heading).push(clockTime(trip.departure));
    }
    const summary = next ? `Next ${next.edge.mode} · ${clockTime(next.departure)} to ${destination(next)}` : 'Service finished for today.';
    board = `<details class="departures" data-keep="departures"><summary>Today’s departures</summary>
      <p class="service-day">${now.day} · Pacific time</p>
      ${[...groups].map(([heading, times]) => `<p class="departure-group"><strong>${heading}</strong><br>${times.join(' · ')}</p>`).join('') || '<p>Service finished for today.</p>'}
      </details><p class="station-next">${summary}</p>`;
  }
  const unfinished = construction.filter(line => [line.from, line.to].includes(slug)).map(line =>
    `<li>Train to ${title(line.from === slug ? line.to : line.from)} · In progress</li>`).join('');
  const closures = [...postedClosures.values()].filter(c => c.towns.includes(slug)).map(c =>
    `<li>${c.title} · ${c.note}</li>`).join('');
  const notices = unfinished + closures;
  return board + (notices ? `<details class="station-notices" data-keep="notices"><summary>Travel notices</summary><ul>${notices}</ul></details>` : '');
}

export function roadNotices(extra) {
  const notices = [...postedClosures.values()].map(c => `<li><strong>${c.title}</strong><span>${c.note}</span></li>`);
  for (const id of extra) {
    const road = roads.find(edge => edge.id === id);
    if (road) notices.push(`<li>${title(road.from)} – ${title(road.to)} · closed for this trip</li>`);
  }
  return `<details class="route-notices" data-keep="roads"><summary>Road closures (${notices.length})</summary><ul>${notices.join('')}</ul></details>`;
}

export function routeResult(from, to, mode, route, now, extra) {
  let notice = '';
  if (mode === 'transit' && construction.some(edge => pair(edge.from, edge.to, from, to))) {
    notice = '<p class="travel-notice">Direct train · In progress</p>';
  } else if (mode === 'road') {
    const closure = [...postedClosures.values()].find(c => pair(...c.towns, from, to));
    if (closure) notice = `<p class="travel-notice">${closure.note}</p>`;
  }
  let content = '';
  if (route?.status === 'ok') {
    const steps = itinerary(route.legs);
    const next = steps.find(step => step.mode !== 'road');
    const parts = [];
    if (route.driving) parts.push(duration(route.driving) + ' driving');
    if (route.riding) parts.push(duration(route.riding) + (mode === 'road' ? ' on the ferry' : ' on board'));
    if (route.waiting) parts.push(duration(route.waiting) + ' waiting');
    const boarding = next && (next.departure < dayMinutes ? 'at ' + clockTime(next.departure)
      : 'on day ' + (1 + Math.floor(next.departure / dayMinutes)));
    const list = steps.map(step => {
      const stops = step.stops.filter(id => bySlug.has(id));
      const places = stops.map(title).join(' → ');
      const timing = step.departure < dayMinutes
        ? clockTime(step.departure) + ' – ' + clockTime(step.arrival)
        : 'Day ' + (1 + Math.floor(step.departure / dayMinutes)) + ' · ' + duration(step.arrival - step.departure);
      return `<li><strong>${label(step.mode)}</strong> ${places}<small>${timing}</small></li>`;
    }).join('');
    content = `<div class="journey-time"><strong>${duration(route.total)}</strong><span>Arrive ${clockTime(route.arrival)} PT</span></div>
      <p>${parts.join(' · ')}</p>
      ${next ? `<p class="next-boarding">${label(next.mode)} from ${title(next.stops[0])} ${boarding}</p>` : ''}
      <details data-keep="steps"><summary>Trip details</summary><ol class="journey-steps">${list}</ol></details>`;
  } else if (route?.status === 'here') content = '<p>You’re already at your destination.</p>';
  else if (route?.status === 'finished') content = '<p>Service has finished for today.</p>';
  else if (route?.status === 'unconnected') {
    content = mode === 'transit' ? '<p>No rail or ferry connection between these towns. Try Road.</p>' : '<p>No open road or ferry route between these towns.</p>';
  }
  if (mode === 'transit') content += `<p class="service-day">${now.day} · Pacific time</p>`;
  return notice + content + (mode === 'road' ? roadNotices(extra) : '');
}

export function mapOverlay(mode, from, to, legs, extra) {
  const markup = [];
  if (mode === 'transit') {
    const ink = lines.map(edge => {
      const style = edge.status === 'in-progress' ? edge.status : edge.mode;
      return `<polyline class="network-casing ${style}" points="${edge.geometry}"/><polyline class="network ${style}" points="${edge.geometry}"/>`;
    }).join('');
    markup.push(`<g class="network-layer${legs?.length ? ' has-route' : ''}">${ink}</g>`);
  }
  for (const leg of legs || []) {
    markup.push(`<polyline class="route-halo" points="${leg.edge.geometry}"/><polyline class="route-line ${leg.edge.mode}" points="${leg.edge.geometry}"/>`);
  }
  if (mode === 'road') {
    const marks = [...postedClosures.values()].map(c => c.point);
    for (const id of extra) {
      const road = roads.find(edge => edge.id === id);
      if (!road) continue;
      const points = road.geometry.split(' ');
      marks.push(points[Math.floor(points.length / 2)].split(',').map(Number));
    }
    for (const [x, y] of marks) markup.push(`<g class="closed-mark" transform="translate(${x} ${y})"><circle r="10"/><path d="m-4 -4 8 8 m-8 0 8 -8"/></g>`);
  }
  if (mode === 'transit') {
    for (const town of towns) {
      const served = hasStation(town.slug);
      const capital = town.slug === 'us-city';
      const radius = capital ? 13 : 7;
      const dot = `<circle class="transit-town${served ? ' station' : ''}" r="${radius}"/>`;
      const star = capital ? '<path fill="white" d="m0 -9 2.5 6.1 6.6.5-5 4.4 1.6 6.4L0 4-5.7 7.4-4.1 1-9.1-3.4l6.6-.5Z"/>' : '';
      markup.push(`<g transform="translate(${town.x} ${town.y})">${dot}${star}</g>`);
    }
  }
  for (const id of new Set([from, to])) {
    const place = bySlug.get(id);
    if (place) markup.push(`<circle class="route-pin" cx="${place.x}" cy="${place.y}" r="14"/>`);
  }
  return markup.join('');
}

// Keep a timetable or itinerary open through the next minute tick.
export function updateMarkup(element, html) {
  if (element._rendered === html) return;
  const open = [...element.querySelectorAll('details[open]')].map(d => d.dataset.keep);
  const focused = element.ownerDocument.activeElement?.closest('summary')?.parentElement;
  element.innerHTML = html;
  element._rendered = html;
  for (const details of element.querySelectorAll('details')) {
    details.open = open.includes(details.dataset.keep);
    if (focused && focused.dataset.keep === details.dataset.keep) details.querySelector('summary').focus({ preventScroll: true });
  }
}
