import test from 'node:test';
import assert from 'node:assert/strict';
import { lockMapGestures } from '../map-gestures.js';

test('map double taps, pinch gestures and zoom wheels are consumed while normal controls work', () => {
  const root = new EventTarget();
  lockMapGestures(root);
  function fire(type, time, surface = true, fields = {}) {
    const e = new Event(type,{cancelable:true});
    Object.defineProperties(e,{
      target:{value:{closest:() => surface}}, timeStamp:{value:time},
    });
    Object.assign(e,{touches:[],changedTouches:[{clientX:100,clientY:50}]},fields);
    root.dispatchEvent(e);
    return e.defaultPrevented;
  }
  assert.equal(fire('touchstart',0,true,{touches:[{}]}),false);
  assert.equal(fire('touchend',80),false);
  fire('touchstart',150,true,{touches:[{}]});
  assert.equal(fire('touchend',220),true);
  fire('touchstart',1000,true,{touches:[{}]});
  assert.equal(fire('touchstart',1020,true,{touches:[{},{}]}),true);
  assert.equal(fire('touchmove',1040,true,{touches:[{},{}]}),true);
  assert.equal(fire('gesturestart',1050),true);
  fire('touchcancel',1060);
  assert.equal(fire('dblclick',1500),true);
  assert.equal(fire('wheel',1600,true,{ctrlKey:true}),true);
  assert.equal(fire('wheel',1700,true,{ctrlKey:false}),false);
  assert.equal(fire('gesturestart',1800,false),false);
  assert.equal(fire('dblclick',1900,false),false);
});

function homeEntry(detail = 1) {
  const root = new EventTarget();
  let home = true;
  root.querySelector = selector => selector === '.home' && home;
  lockMapGestures(root);
  function fire(type, fields = {}) {
    const event = new Event(type, { cancelable: true });
    const target = { closest: selector => home ? selector === 'a[href="/travel-guide"]' : selector === '.guide-page' };
    Object.defineProperty(event, 'target', { value: target });
    Object.assign(event, { clientX: 125, clientY: 150, button: 0, detail: 1, pointerType: 'mouse', ...fields });
    root.dispatchEvent(event);
    return event.defaultPrevented;
  }
  assert.equal(fire('click', { detail }), false);
  home = false;
  return fire;
}

test('entering the guide consumes residual clicks, focus and stationary pointer events, up to the next tap', () => {
  const fire = homeEntry();
  assert.equal(fire('pointermove'), true);
  assert.equal(fire('focus'), true);
  assert.equal(fire('click'), true);
  assert.equal(fire('pointerdown', { pointerType: 'touch' }), false);
  assert.equal(fire('click', { pointerType: 'touch' }), false);
});

test('a fresh mouse move, keyboard action or assistive activation can use the guide immediately', () => {
  const mouse = homeEntry();
  assert.equal(mouse('pointermove', { clientX: 140 }), false);
  assert.equal(mouse('click'), false);
  const keyboard = homeEntry(0);
  assert.equal(keyboard('keydown', { key: 'Tab' }), false);
  assert.equal(keyboard('focus'), false);
  const assistive = homeEntry();
  assert.equal(assistive('click', { detail: 0 }), false);
});
