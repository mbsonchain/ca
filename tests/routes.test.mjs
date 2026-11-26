import test from 'node:test';
import assert from 'node:assert/strict';
import { planTrip, names, roads, towns } from '../routes.js';
import { places } from '../places.js';

const findRoute = (from, to, closed) => planTrip(from, to, 'road', 360, closed).legs ?? null;

test('the renamed towns and every regional link resolve on the revised atlas', () => {
  const expected = { goldpoint:[886,814], greenpoint:[947,946], sfida:[821,973], orangepoint:[957,1076], amoretown:[46,501], flowertown:[245,929] };
  for (const [slug, point] of Object.entries(expected)) {
    const place = towns.find(p => p.slug === slug);
    assert.deepEqual([place.x, place.y], point);
  }
  assert.equal(towns.length, 20);
  assert.deepEqual(places.filter(p => p.area).map(p => p.slug), ['freetown-formal', 'island-formal']);
  assert.ok(towns.every(p => p.x !== 874 || p.y !== 1174));
  for (const p of places) for (const slug of p.nearby) assert.ok(places.some(other => other.slug === slug));
});

test('every town pair connects in both directions on the surveyed network', () => {
  for (const a of towns) for (const b of towns) {
    const route = findRoute(a.slug, b.slug);
    let node = a.slug;
    for (const step of route) {
      assert.equal(step.from, node);
      assert.ok(names.has(step.to));
      node = step.to;
    }
    assert.equal(node, b.slug);
  }
  assert.equal(findRoute('island-formal', 'hollywood'), null);
  assert.equal(new Set(roads.map(r => r.id)).size, roads.length);
  for (const edge of roads) {
    for (const [id, index] of [[edge.from,0],[edge.to,-1]]) {
      const town = towns.find(p => p.slug === id);
      if (town) assert.deepEqual(edge.geometry.split(' ').at(index).split(',').map(Number), [town.x,town.y]);
    }
  }
});

test('a closed lake road sends directions around the other shore', () => {
  const [usual] = findRoute('mountaintop','laketown');
  const detour = findRoute('mountaintop','laketown',new Set([usual.edge.id]));
  assert.equal(detour.length, 1);
  assert.notEqual(detour[0].edge.variant, usual.edge.variant);
});

test('ferry closures reroute or disconnect islands and reopening restores the crossing', () => {
  const crossing = findRoute('freetown','clifftown')[0].edge;
  assert.equal(crossing.mode, 'ferry');
  const detour = findRoute('freetown','clifftown',new Set([crossing.id]));
  assert.ok(detour.length > 1);
  assert.ok(detour.every(leg => leg.edge.id !== crossing.id));
  const island = findRoute('goldpoint','greenpoint')[0].edge;
  assert.equal(findRoute('orangepoint','freetown',new Set([island.id])), null);
  assert.ok(findRoute('orangepoint','freetown').some(leg => leg.edge.id === island.id));
  assert.deepEqual(findRoute('orangepoint','orangepoint'), []);
});
