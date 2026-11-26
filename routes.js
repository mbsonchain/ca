import { segments } from './road-network.js';
import { places } from './places.js';

export const towns = places.filter(place => !place.area);
export const names = new Map(towns.map(place => [place.slug, place.name]));
const junctions = {
  'north-fork': 'North coast fork',
  'amoreport-fork': 'Amoreport fork',
  'east-fork': 'East desert fork',
  'west-fork': 'West desert fork',
};
for (const [id, name] of Object.entries(junctions)) names.set(id, name);

export const roads = segments.map(([from, to, mode, variant, geometry]) => {
  const points = geometry.split(' ').map(pair => pair.split(',').map(Number));
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  const id = [from, to, variant.toLowerCase().replaceAll(' ', '-')].filter(Boolean).join('~');
  return { id, from, to, mode, variant, geometry, points, length };
});

const adjacency = new Map(Array.from(names.keys(), id => [id, []]));
for (const road of roads) {
  adjacency.get(road.from).push({ to: road.to, road });
  adjacency.get(road.to).push({ to: road.from, road });
}

// Minimize traced distance. Water crossings use their own drawn paths.
export function findRoute(from, to, closed = new Set()) {
  if (!adjacency.has(from) || !adjacency.has(to)) return null;
  const remaining = new Set(adjacency.keys());
  const distances = new Map([[from, 0]]);
  const previous = new Map();
  while (remaining.size) {
    let nearest;
    let shortest = Infinity;
    for (const node of remaining) {
      if (distances.get(node) < shortest) {
        nearest = node;
        shortest = distances.get(node);
      }
    }
    if (nearest === undefined) return null;
    if (nearest === to) break;
    remaining.delete(nearest);
    for (const leg of adjacency.get(nearest)) {
      if (!remaining.has(leg.to) || closed.has(leg.road.id)) continue;
      const distance = shortest + leg.road.length;
      if (distance >= (distances.get(leg.to) ?? Infinity)) continue;
      distances.set(leg.to, distance);
      previous.set(leg.to, { from: nearest, to: leg.to, road: leg.road });
    }
  }
  const path = [];
  for (let node = to; node !== from;) {
    const leg = previous.get(node);
    path.push(leg);
    node = leg.from;
  }
  return path.reverse();
}
