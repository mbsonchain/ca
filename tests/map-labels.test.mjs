import test from 'node:test';
import assert from 'node:assert/strict';
import { isMapPaper, setupMapLabels } from '../map-labels.js';

function fixture(t, viewport = 1000) {
  const previous = Object.fromEntries(['document', 'ResizeObserver', 'innerWidth'].map(key => [key, globalThis[key]]));
  t.after(() => Object.assign(globalThis, previous));
  const background = new EventTarget();
  const attributes = {};
  background.setAttribute = (key, value) => { attributes[key] = value; };
  const map = new EventTarget();
  const bounds = viewport === 390 ? { left: 16, top: 60, width: 358, height: 537 } : { left: 100, top: 60, width: 512, height: 768 };
  Object.assign(map, { complete: true, naturalWidth: 1024, naturalHeight: 1536, getBoundingClientRect: () => bounds });
  let pixel = [255, 255, 255, 255];
  let sampled;
  const context = { drawImage() {}, getImageData(x, y) { sampled = [x, y]; return { data: pixel }; } };
  const names = [
    { dataset: { x: '46', side: 'left' }, offsetWidth: 60, style: {} },
    { dataset: { x: '854', side: 'right' }, offsetWidth: 54, style: {} },
  ];
  const labels = { hidden: true, querySelectorAll: () => names };
  const canvas = { getBoundingClientRect: () => bounds };
  const selectors = { '.guide-background': background, '.map-image': map, '.map-labels': labels, '.map-canvas': canvas };
  globalThis.document = { createElement: () => ({ getContext: () => context }), fonts: { ready: Promise.resolve() } };
  globalThis.innerWidth = viewport;
  let disconnected = false;
  globalThis.ResizeObserver = class { observe() {} disconnect() { disconnected = true; } };
  const changes = [];
  const dispose = setupMapLabels({ querySelector: selector => selectors[selector] }, { onChange: value => changes.push(value) });
  t.after(dispose);
  function clickMap(color) {
    pixel = color;
    const event = new Event('click');
    Object.assign(event, { clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 });
    map.dispatchEvent(event);
  }
  return { background, attributes, labels, names, changes, bounds, clickMap, dispose, sampled: () => sampled, disconnected: () => disconnected };
}

test('paper detection matches the display filter without toggling on colored terrain', () => {
  assert.equal(isMapPaper([243, 244, 245, 255]), true);
  assert.equal(isMapPaper([242, 255, 255, 255]), false);
  assert.equal(isMapPaper([255, 210, 120, 255]), false);
  assert.equal(isMapPaper([20, 170, 80, 255]), false);
});

test('background activates names; white pixels toggle them; terrain leaves them unchanged', t => {
  const f = fixture(t);
  assert.equal(f.labels.hidden, true);
  f.background.dispatchEvent(new Event('click'));
  assert.equal(f.labels.hidden, false);
  assert.equal(f.attributes['aria-pressed'], 'true');
  f.clickMap([243, 245, 244, 255]);
  assert.equal(f.labels.hidden, true);
  assert.deepEqual(f.sampled(), [512, 768]);
  f.clickMap([20, 170, 80, 255]);
  assert.equal(f.labels.hidden, true);
  f.clickMap([255, 255, 255, 255]);
  assert.deepEqual(f.changes, [true, false, true]);
});

test('Orangepoint is left and Freetown Formal is right; narrow screens retain both names', t => {
  const f = fixture(t, 390);
  f.background.dispatchEvent(new Event('click'));
  for (const label of f.names) {
    const screenLeft = parseFloat(label.style.left) + f.bounds.left;
    assert.ok(screenLeft >= 8);
    assert.ok(screenLeft + label.offsetWidth <= 382);
  }
  assert.equal(parseFloat(f.names[0].style.left) + f.bounds.left, 8);
  assert.ok(parseFloat(f.names[1].style.left) > 854 / 1024 * f.bounds.width);
});

test('leaving the guide removes toggle listeners and its resize observer', t => {
  const f = fixture(t);
  f.dispose();
  f.background.dispatchEvent(new Event('click'));
  f.clickMap([255, 255, 255, 255]);
  assert.deepEqual(f.changes, []);
  assert.equal(f.disconnected(), true);
});
