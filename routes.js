import { places } from './places.js';
import { segments, postedClosures } from './road-network.js';
import { lines, nextTrip } from './transit.js';

export const towns = places.filter(place => !place.area);
export const names = new Map(towns.map(place => [place.slug, place.name]));
for (const [id, name] of Object.entries({
  'north-fork': 'North coast fork', 'amoreport-fork': 'Amoreport fork',
  'east-fork': 'East desert fork', 'west-fork': 'West desert fork',
})) names.set(id, name);

export const roads = segments.map(([from, to, mode, variant, geometry, minutes]) => ({
  from, to, mode, variant, geometry, minutes,
  id: [from, to, variant.toLowerCase().replaceAll(' ', '-')].filter(Boolean).join('~'),
}));
const networks = new Map();
for (const [mode, edges] of [['road', roads], ['transit', lines.filter(edge => edge.status === 'running')]]) {
  const graph = new Map();
  for (const edge of edges) {
    for (const [from, to] of [[edge.from, edge.to], [edge.to, edge.from]]) {
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from).push({ from, to, edge });
    }
  }
  networks.set(mode, graph);
}

// Earliest arrival is monotonic on both roads and the fixed daily services.
// With no clock, the same search checks whether a connection exists at all.
function search(graph, from, to, at, closed) {
  const pending = new Set(graph.keys());
  const times = new Map([[from, at ?? 0]]);
  const previous = new Map();
  while (pending.size) {
    let node, earliest = Infinity;
    for (const id of pending) {
      if (times.get(id) < earliest) { earliest = times.get(id); node = id; }
    }
    if (node === undefined) break;
    if (node === to) {
      const legs = [];
      while (node !== from) {
        const leg = previous.get(node);
        legs.push(leg);
        node = leg.from;
      }
      return legs.reverse();
    }
    pending.delete(node);
    for (const connection of graph.get(node)) {
      const { edge, to: next } = connection;
      if (!pending.has(next) || (edge.mode !== 'train' && closed.has(edge.id))) continue;
      let leg;
      if (at === null || edge.mode === 'road') {
        leg = { ...connection, departure: earliest, arrival: earliest + (edge.minutes ?? 1) };
      } else {
        const trip = nextTrip(node, next, earliest);
        if (!trip) continue;
        leg = { ...trip, edge };
      }
      if (leg.arrival >= (times.get(next) ?? Infinity)) continue;
      times.set(next, leg.arrival);
      previous.set(next, leg);
    }
  }
  return null;
}

export function planTrip(from, to, mode, minute, extraClosed = []) {
  const graph = networks.get(mode);
  if (!names.has(from) || !names.has(to) || !graph) return { status: 'invalid' };
  if (from === to) return { status: 'here', legs: [] };
  if (!graph.has(from) || !graph.has(to)) return { status: 'unconnected' };
  const closed = new Set([...postedClosures.keys(), ...extraClosed]);
  const legs = search(graph, from, to, minute, closed);
  if (!legs) return { status: search(graph, from, to, null, closed) ? 'finished' : 'unconnected' };
  let driving = 0, riding = 0, waiting = 0, time = minute;
  let lastRun;
  for (const leg of legs) {
    const dwell = leg.departure - time;
    if (leg.run && leg.run === lastRun) riding += dwell;
    else waiting += dwell;
    if (leg.edge.mode === 'road') driving += leg.arrival - leg.departure;
    else riding += leg.arrival - leg.departure;
    time = leg.arrival;
    lastRun = leg.run;
  }
  return { status: 'ok', legs, driving, riding, waiting, arrival: time, total: time - minute };
}


export function itinerary(legs) {
  const steps = [];
  for (const leg of legs) {
    const previous = steps.at(-1);
    const sameDrive = previous?.mode === 'road' && leg.edge.mode === 'road';
    if (sameDrive || (leg.run && leg.run === previous?.run)) {
      previous.stops.push(leg.to);
      previous.arrival = leg.arrival;
    } else {
      steps.push({ mode: leg.edge.mode, run: leg.run, stops: [leg.from, leg.to], departure: leg.departure, arrival: leg.arrival });
    }
  }
  return steps;
}
