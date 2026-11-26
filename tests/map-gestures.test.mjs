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
