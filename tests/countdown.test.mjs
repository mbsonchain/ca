import test from 'node:test';
import assert from 'node:assert/strict';
import { startCountdown } from '../countdown.js';

const dateTime = '2027-02-14T11:11:00-08:00';

test('the clock counts days and rolls over at the second boundary', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.UTC(2027, 1, 13, 19, 11) });
  const clock = { dateTime };
  startCountdown(clock);
  assert.equal(clock.textContent, '01d 00h 00m 00s');
  t.mock.timers.tick(1000);
  assert.equal(clock.textContent, '00d 23h 59m 59s');
});

test('the last second lasts until exactly 11:11 a.m. PST and late visits show zero', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.UTC(2027, 1, 14, 19, 10, 59, 750) });
  const clock = { dateTime };
  startCountdown(clock);
  t.mock.timers.tick(249);
  assert.equal(clock.textContent, '00d 00h 00m 01s');
  t.mock.timers.tick(1);
  assert.equal(clock.textContent, '00d 00h 00m 00s');
  t.mock.timers.tick(60000);
  const lateVisit = { dateTime };
  startCountdown(lateVisit);
  assert.equal(lateVisit.textContent, clock.textContent);
});
