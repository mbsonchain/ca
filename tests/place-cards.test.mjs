import test from 'node:test';
import assert from 'node:assert/strict';
import { setupCards } from '../place-cards.js';

function fixture(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const previous = Object.fromEntries(['document', 'window', 'innerWidth', 'innerHeight'].map(key => [key, globalThis[key]]));
  t.after(() => Object.assign(globalThis, previous));
  const document = new EventTarget();
  class Element extends EventTarget {
    constructor(kind) { super(); this.kind = kind; this.hidden = false; this.style = {}; this.attrs = {}; this.dataset = {}; }
    setAttribute(key, value) { this.attrs[key] = value; }
    append(child) { child.parent = this; }
    after(child) { child.parent = this.parent; }
    remove() { this.parent = null; }
    contains(target) { return target === this || target?.parent === this; }
    closest(selector) {
      if (selector === '.hotspot' && this.kind === 'hotspot') return this;
      if (selector === '.guide-background, .map-image' && ['background', 'map'].includes(this.kind)) return this;
      return null;
    }
    getBoundingClientRect() { return { top: 300, bottom: 330, left: 100, right: 130, width: 30, height: 30 }; }
    get offsetWidth() { return 218; }
    get offsetHeight() { return 218; }
    focus() { document.activeElement = this; this.dispatchEvent(new Event('focus')); }
    set innerHTML(value) {
      this.closeControl = new Element('close');
      this.link = new Element('link');
      this.append(this.closeControl);
      this.append(this.link);
    }
    querySelector(selector) { return selector === 'a' ? this.link : this.closeControl; }
  }
  const main = new Element('main');
  const hotspot = new Element('hotspot');
  main.append(hotspot);
  main.querySelectorAll = () => [hotspot];
  let card;
  document.createElement = () => { card = new Element('card'); return card; };
  document.activeElement = new Element('body');
  document.querySelector = () => ({ getBoundingClientRect: () => ({ top: 768 }) });
  Object.assign(globalThis, { document, window: new EventTarget(), innerWidth: 390, innerHeight: 844 });
  const navigations = [];
  const dispose = setupCards(main, () => ({ title: 'Freetown', eyebrow: 'the eastern island', intro: 'An island junction.', url: '/travel-guide/freetown', link: 'explore' }), url => navigations.push(url));
  t.after(dispose);
  function fire(target, type, fields = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { detail: 1, pointerType: 'touch', ...fields });
    target.dispatchEvent(event);
    return event;
  }
  function outside(type, kind = 'background') {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, 'target', { value: new Element(kind) });
    document.dispatchEvent(event);
    return event;
  }
  return { card, hotspot, document, fire, outside, navigations };
}

for (const pointerType of ['touch', 'pen']) {
  test(`${pointerType} card survives finger lift and blur until the dismissal tap finishes`, t => {
    const f = fixture(t);
    f.fire(f.hotspot, 'pointerdown', { pointerType });
    f.fire(f.hotspot, 'click', { pointerType });
    f.fire(f.hotspot, 'pointerleave', { pointerType });
    f.fire(f.hotspot, 'blur');
    f.fire(f.card, 'pointerleave', { pointerType });
    f.fire(f.card, 'focusout');
    t.mock.timers.tick(1000);
    assert.equal(f.card.hidden, false, 'touch cards must not use the hover-close timer');
    assert.equal(f.hotspot.attrs['aria-expanded'], 'true');
    f.outside('pointerdown');
    t.mock.timers.tick(500);
    assert.equal(f.card.hidden, false, 'do not change the tap target before click');
    assert.equal(f.outside('click').defaultPrevented, true);
    assert.equal(f.card.hidden, true);
    assert.equal(f.hotspot.attrs['aria-expanded'], 'false');
    f.outside('pointerdown');
    assert.equal(f.outside('click').defaultPrevented, false, 'the next tap can toggle names');
    assert.deepEqual(f.navigations, []);
  });
}

test('mouse hover still closes after leaving, and a mouse click still navigates', t => {
  const f = fixture(t);
  f.fire(f.hotspot, 'pointerenter', { pointerType: 'mouse' });
  assert.equal(f.card.hidden, false);
  f.fire(f.hotspot, 'pointerleave', { pointerType: 'mouse' });
  t.mock.timers.tick(221);
  assert.equal(f.card.hidden, true);
  f.fire(f.hotspot, 'pointerdown', { pointerType: 'mouse' });
  f.fire(f.hotspot, 'click', { pointerType: 'mouse' });
  assert.deepEqual(f.navigations, ['/travel-guide/freetown']);
});

test('touch close control and keyboard Escape close pinned cards', t => {
  const f = fixture(t);
  f.fire(f.hotspot, 'pointerdown');
  f.fire(f.hotspot, 'click');
  f.fire(f.card.closeControl, 'click');
  assert.equal(f.card.hidden, true);
  assert.equal(f.document.activeElement, f.hotspot);
  f.fire(f.hotspot, 'click', { detail: 0 });
  assert.equal(f.card.hidden, false);
  assert.equal(f.document.activeElement, f.card.link);
  f.fire(f.document, 'keydown', { key: 'Escape' });
  assert.equal(f.card.hidden, true);
});
