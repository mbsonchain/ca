import assert from 'node:assert/strict';
import test from 'node:test';
import { planTrip, itinerary, roads } from '../routes.js';
import { postedClosures } from '../road-network.js';
import { clockTime, lines, nextTrip, serviceTime, stationDepartures } from '../transit.js';
import { routeResult, stationInfo } from '../directions-view.js';

test('Flowertown to Hollywood is direct in both directions and through trains stay together', () => {
  for (const [from, to] of [['hollywood', 'flowertown'], ['flowertown', 'hollywood']]) {
    const r = planTrip(from, to, 'transit', 320);
    assert.deepEqual(r.legs.map(leg => leg.to), [to]);
    assert.equal(r.riding, 29);
  }
  const r = planTrip('amoreport', 'hollywood', 'transit', 330);
  assert.deepEqual(r.legs.map(leg => leg.to), ['us-city', 'flowertown', 'hollywood']);
  assert.equal(itinerary(r.legs).length, 1);
  assert.equal(r.riding, 17 + 32 + 29 + 4);
  assert.equal(r.waiting, 0);
  assert.equal(r.total, r.driving + r.riding + r.waiting);
  assert.deepEqual(stationDepartures('open-city', 0), []);
  assert.equal(planTrip('amoreport', 'us-city', 'transit', 330, ['amoreport~us-city']).status, 'ok');
});

test('only the three requested lines are in progress and no trains run on the islands or beyond Amoreport', () => {
  const unfinished = lines.filter(e => e.status === 'in-progress');
  assert.deepEqual(unfinished.map(e => e.id).sort(), ['amoreport~camporella', 'flowertown~formal-city', 'formal-city~hollywood']);
  for (const edge of unfinished) {
    assert.equal(nextTrip(edge.from, edge.to, 0), undefined);
    assert.equal(nextTrip(edge.to, edge.from, 0), undefined);
  }
  assert.deepEqual(planTrip('formal-city', 'hollywood', 'transit', 335).legs.map(l => l.to), ['santamore', 'hollywood']);
  assert.deepEqual(planTrip('flowertown', 'formal-city', 'transit', 335).legs.map(l => l.to), ['hollywood', 'santamore', 'formal-city']);
  assert.equal(planTrip('amoreport', 'camporella', 'transit', 335).status, 'unconnected');
  for (const stop of ['freetown', 'freeport', 'goldpoint', 'greenpoint', 'orangepoint', 'camporella', 'punto-damore']) {
    assert.ok(stationDepartures(stop, 0).every(d => d.edge.mode === 'ferry'));
  }
});

test('all operating links have two-way departures, last service and no next-day spill', () => {
  for (const edge of lines.filter(e => e.status === 'running')) {
    for (const [a, b] of [[edge.from, edge.to], [edge.to, edge.from]]) {
      const runs = stationDepartures(a, 0).filter(row => row.to === b);
      assert.ok(runs.length > 1);
      const first = runs[0], last = runs.at(-1);
      assert.equal(nextTrip(a, b, first.departure), first);
      assert.notEqual(nextTrip(a, b, first.departure + 1), first);
      assert.equal(nextTrip(a, b, last.departure + 1), undefined);
      assert.ok(last.arrival < 1440);
    }
  }
  assert.equal(planTrip('greenpoint', 'goldpoint', 'transit', 1439).status, 'finished');
  assert.equal(planTrip('greenpoint', 'goldpoint', 'road', 1439).status, 'finished');
  assert.equal(planTrip('hollywood', 'freetown', 'transit', 600).status, 'unconnected');
  assert.equal(planTrip('open-city', 'hollywood', 'road', 1439).status, 'ok');
  assert.match(clockTime(planTrip('open-city', 'hollywood', 'road', 1439).arrival), /\(\+1 day\)/);
});

test('the Pacific service day rolls over at local midnight and respects seasonal offsets', () => {
  for (const [iso, minute] of [
    ['2026-11-26T07:59:00Z', 1439], ['2026-11-26T08:00:00Z', 0],
    ['2027-06-10T07:00:00Z', 0], ['2027-03-14T10:00:00Z', 180],
  ]) assert.equal(serviceTime(new Date(iso)).minute, minute);
  assert.match(serviceTime(new Date('2026-11-26T07:30:00Z')).day, /Nov 25/);
  assert.match(serviceTime(new Date('2026-11-26T08:30:00Z')).day, /Nov 26/);
});

test('both posted breaks match the atlas and force real detours while roads stay drawn', () => {
  for (const [id, closure] of postedClosures) {
    const edge = roads.find(e => e.id === id);
    assert.ok(edge.geometry.split(' ').includes(closure.point.join(',')));
    for (const [from, to] of [closure.towns, [...closure.towns].reverse()]) {
      const r = planTrip(from, to, 'road', 520);
      assert.equal(r.status, 'ok');
      assert.ok(r.legs.every(leg => !postedClosures.has(leg.edge.id)));
      assert.match(routeResult(from, to, 'road', r, { day: 'Wed' }, []), new RegExp(closure.note));
      if (from === 'camporella' || to === 'camporella') assert.ok(r.legs.some(leg => leg.edge.id === 'camporella~freeport'));
    }
  }
  const lakeTrip = planTrip('laketown', 'clifftown', 'road', 520);
  assert.ok(lakeTrip.legs.find(leg => leg.to === 'formal-city'));
  const crossing = planTrip('freetown', 'clifftown', 'road', 340);
  assert.equal(crossing.driving, 0);
  assert.equal(crossing.waiting, 5);
  assert.equal(crossing.riding, 18);
});

test('station boards and direction notices distinguish completed and planned service', () => {
  const now = { minute: 700, day: 'Thu, Nov 26' };
  assert.match(stationInfo('formal-city', now), /Train to Hollywood · In progress/);
  assert.match(stationInfo('formal-city', now), /Train to Hollywood via Sant’Amore/);
  assert.match(stationInfo('camporella', now), /Next ferry/);
  assert.match(stationInfo('camporella', { minute: 1439, day: 'Thu, Nov 26' }), /Service finished for today/);
  assert.doesNotMatch(stationInfo('freetown', now), /Train to/);
  const r = planTrip('formal-city', 'hollywood', 'transit', 700);
  const view = routeResult('formal-city', 'hollywood', 'transit', r, now, []);
  assert.match(view, /Direct train · In progress/);
  assert.match(view, /Sant’Amore/);
});
