import assert from 'node:assert/strict';
import test from 'node:test';
import { planTrip, itinerary, roads } from '../routes.js';
import { postedClosures } from '../road-network.js';
import { clockTime, lines, nextTrip, serviceTime, stationDepartures } from '../transit.js';
import { mapOverlay, routeResult, stationInfo } from '../directions-view.js';
import { directionsControls, setupMapArtwork } from '../directions.js';

test('Flowertown to Hollywood is direct in both directions and through trains stay together', () => {
  for (const [from, to] of [['hollywood', 'flowertown'], ['flowertown', 'hollywood']]) {
    const r = planTrip(from, to, 'transit', 320);
    assert.deepEqual(r.legs.map(leg => leg.to), [to]);
    assert.equal(r.riding, 270);
  }
  const r = planTrip('amoreport', 'hollywood', 'transit', 330);
  assert.deepEqual(r.legs.map(leg => leg.to), ['us-city', 'flowertown', 'hollywood']);
  assert.equal(itinerary(r.legs).length, 1);
  assert.equal(r.riding, 130 + 230 + 270 + 16);
  assert.equal(r.waiting, 0);
  assert.equal(r.total, r.driving + r.riding + r.waiting);
  assert.deepEqual(stationDepartures('open-city', 0), []);
  assert.equal(planTrip('amoreport', 'us-city', 'transit', 330, ['amoreport~us-city']).status, 'ok');
});

test('the island shuttle is the only island train and construction lines have no departures', () => {
  const unfinished = lines.filter(e => e.status === 'in-progress');
  assert.deepEqual(unfinished.map(e => e.id).sort(), ['amoreport~camporella', 'flowertown~formal-city', 'formal-city~hollywood', 'formal-city~sfida']);
  for (const edge of unfinished) {
    assert.equal(nextTrip(edge.from, edge.to, 0), undefined);
    assert.equal(nextTrip(edge.to, edge.from, 0), undefined);
  }
  assert.deepEqual(planTrip('formal-city', 'hollywood', 'transit', 335).legs.map(l => l.to), ['santamore', 'hollywood']);
  assert.deepEqual(planTrip('flowertown', 'formal-city', 'transit', 335).legs.map(l => l.to), ['hollywood', 'santamore', 'formal-city']);
  assert.equal(planTrip('amoreport', 'camporella', 'transit', 335).status, 'unconnected');
  for (const stop of ['goldpoint', 'greenpoint', 'orangepoint', 'camporella', 'punto-damore']) {
    assert.ok(stationDepartures(stop, 0).every(d => d.edge.mode === 'ferry'));
  }
});

test('boards show only departures within the current day, including overnight trains', () => {
  for (const edge of lines.filter(e => e.status === 'running')) {
    for (const [a, b] of [[edge.from, edge.to], [edge.to, edge.from]]) {
      const runs = stationDepartures(a, 0).filter(row => row.to === b);
      assert.ok(runs.length > 1);
      const first = runs[0], last = runs.at(-1);
      assert.deepEqual(nextTrip(a, b, first.departure), first);
      assert.notEqual(nextTrip(a, b, first.departure + 1)?.run, first.run);
      assert.equal(nextTrip(a, b, last.departure + 1), undefined);
      assert.ok(runs.every(trip => trip.departure >= 0 && trip.departure < 1440 && trip.arrival > trip.departure));
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
  assert.equal(crossing.riding, 165);
});

test('station boards and direction notices distinguish completed and planned service', () => {
  const now = { minute: 700, day: 'Thu, Nov 26' };
  assert.match(stationInfo('formal-city', now), /Train to Hollywood · In progress/);
  assert.match(stationInfo('formal-city', now), /Train to Sfida · In progress/);
  assert.match(stationInfo('sfida', now), /Train to Formal City · In progress/);
  assert.match(stationInfo('formal-city', now), /Train to Hollywood via Sant’Amore/);
  assert.match(stationInfo('camporella', now), /Next ferry/);
  assert.match(stationInfo('camporella', { minute: 1439, day: 'Thu, Nov 26' }), /Service finished for today/);
  assert.match(stationInfo('freetown', now), /Train to Freeport/);
  const r = planTrip('formal-city', 'hollywood', 'transit', 700);
  const view = routeResult('formal-city', 'hollywood', 'transit', r, now, []);
  assert.match(view, /Direct train · In progress/);
  assert.match(view, /Sant’Amore/);
  for (const [from, to] of [['formal-city', 'sfida'], ['sfida', 'formal-city']]) {
    const route = planTrip(from, to, 'transit', now.minute);
    assert.equal(route.status, 'unconnected');
    assert.match(routeResult(from, to, 'transit', route, now, []), /Direct train · In progress/);
  }
});

test('the eastern ferry and the desert road give the atlas its long-distance times', () => {
  const mainland = planTrip('freetown', 'formal-city', 'road', 380);
  assert.deepEqual(mainland.legs.map(leg => leg.to), ['sfida', 'east-fork', 'formal-city']);
  assert.deepEqual([mainland.riding, mainland.driving, mainland.total], [270, 720, 990]);
  const drive = planTrip('formal-city', 'hollywood', 'road', 1320);
  assert.equal(drive.driving, 10 * 60);
  assert.equal(clockTime(drive.arrival), '8:00 AM (+1 day)');
  const fullTrip = planTrip('freetown', 'hollywood', 'road', 380);
  assert.ok(fullTrip.legs.some(leg => leg.to === 'formal-city'));
  assert.deepEqual([fullTrip.driving, fullTrip.riding, fullTrip.total], [22 * 60, 270, 26 * 60 + 30]);
});

test('a through train crosses midnight without changing runs or charging a transfer', () => {
  const result = planTrip('amoreport', 'hollywood', 'transit', 1290);
  assert.ok(result.legs.at(-1).departure >= 1440);
  assert.equal(new Set(result.legs.map(leg => leg.run)).size, 1);
  assert.equal(result.waiting, 0);
  assert.equal(itinerary(result.legs).length, 1);
  assert.equal(result.total, 646);
  const boarding = stationDepartures('flowertown', 0).find(trip => trip.to === 'hollywood' && trip.departure === 226);
  assert.ok(boarding);
  assert.equal(boarding.arrival, 496);
  assert.equal(nextTrip('flowertown', 'hollywood', 1440), undefined);
});

test('the northern closure detour can catch ferries on later days without listing their timetables', () => {
  const route = planTrip('amoreport', 'camporella', 'road', 520);
  assert.equal(route.status, 'ok');
  assert.equal(Math.floor(route.arrival / 1440), 2);
  assert.equal(route.total, route.waiting + route.driving + route.riding);
  assert.ok(route.legs.filter(l => l.edge.mode === 'ferry').every(l => l.departure >= 1440));
  const html = routeResult('amoreport', 'camporella', 'road', route, { day: 'Sun' }, []);
  assert.match(html, /\(\+2 days\)/);
  assert.match(html, /on day 3/);
  assert.match(html, /Day 3 ·/);
  assert.deepEqual(stationDepartures('camporella', 1440), []);
});

test('the transit map draws only the rail and ferry network, its status and town symbols', () => {
  const transit = mapOverlay('transit', '', '', [], []);
  assert.equal((transit.match(/class="network train"/g) || []).length, 6);
  assert.equal((transit.match(/class="network ferry"/g) || []).length, 4);
  assert.equal((transit.match(/class="network in-progress"/g) || []).length, 4);
  assert.equal((transit.match(/class="transit-town/g) || []).length, 20);
  assert.equal((transit.match(/class="transit-town(?: station)?" r="7"/g) || []).length, 19);
  assert.equal((transit.match(/class="transit-town(?: station)?" r="13"/g) || []).length, 1);
  assert.doesNotMatch(transit, /closed-mark|route-line road/);
  const road = mapOverlay('road', '', '', [], []);
  assert.match(road, /closed-mark/);
  assert.doesNotMatch(road, /class="network|transit-town/);
});

test('the homepage stays road-free and pending decodes only reveal the requested guide map', async () => {
  function layer() {
    let finishDecode;
    const image = Object.assign(new EventTarget(), {
      naturalWidth: 1024, complete: false,
      decode: () => new Promise(resolve => { finishDecode = resolve; }),
    });
    return { querySelector: () => image, load: () => image.dispatchEvent(new Event('load')),
      decoded: () => finishDecode() };
  }
  const road = layer(), transit = layer();
  const page = { dataset: { artwork: 'home' }, querySelector: selector => selector === '.road-layer' ? road : transit };
  const atlas = setupMapArtwork(page);
  atlas.show('road');
  road.load();
  assert.equal(page.dataset.artwork, 'home');
  atlas.show('home');
  road.decoded();
  await Promise.resolve();
  assert.equal(page.dataset.artwork, 'home');
  assert.deepEqual([road.hidden, transit.hidden], [true, false]);
  atlas.show('road');
  assert.equal(page.dataset.artwork, 'road');
  assert.deepEqual([road.hidden, transit.hidden], [false, true]);
  atlas.show('transit');
  transit.load();
  assert.equal(page.dataset.artwork, 'road');
  atlas.show('road');
  transit.decoded();
  await Promise.resolve();
  assert.equal(page.dataset.artwork, 'road');
  atlas.show('transit');
  assert.equal(page.dataset.artwork, 'transit');
  assert.deepEqual([road.hidden, transit.hidden], [true, false]);
  atlas.show('home');
  assert.equal(page.dataset.artwork, 'home');
  atlas.show('road');
  assert.equal(page.dataset.artwork, 'road');
  atlas.dispose();
  atlas.show('transit');
  assert.equal(page.dataset.artwork, 'road');
});

test('US City and Hollywood are 18 hours apart by road and have a through train via Flowertown', () => {
  for (const [from, to] of [['us-city', 'hollywood'], ['hollywood', 'us-city']]) {
    assert.equal(planTrip(from, to, 'road', 360).driving, 18 * 60);
    const rail = planTrip(from, to, 'transit', 360);
    assert.equal(rail.riding, 8 * 60 + 28);
    assert.deepEqual(itinerary(rail.legs).map(step => step.stops), [[from, 'flowertown', to]]);
  }
});

test('the island train runs every two hours in both directions and connects the ferry ports', () => {
  for (const [from, to, first] of [['freeport', 'freetown', 360], ['freetown', 'freeport', 390]]) {
    const departures = stationDepartures(from, 0).filter(trip => trip.edge.mode === 'train');
    assert.ok(departures.every(trip => trip.to === to && trip.arrival - trip.departure === 150));
    assert.deepEqual(departures.map(trip => trip.departure), Array.from({ length: 9 }, (_, i) => first + 120 * i));
    assert.equal(planTrip(from, to, 'transit', first).total, 150);
    assert.equal(planTrip(from, to, 'road', first).driving, 135);
  }
  assert.deepEqual(planTrip('camporella', 'sfida', 'transit', 360).legs.map(leg => leg.edge.mode), ['ferry', 'train', 'ferry']);
});

test('both direction fields are noneditable dropdowns offering every town', () => {
  const html = directionsControls();
  assert.doesNotMatch(html, /<input|<textarea|contenteditable/i);
  assert.equal((html.match(/<button type="button" role="combobox"/g) || []).length, 2);
  assert.equal((html.match(/role="option"/g) || []).length, 40);
});
