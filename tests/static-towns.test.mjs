import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { places } from '../places.js';

test('every town is a static document, and the countdown appears only on home', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs']);
  const read = path => readFile('dist/' + path + '.html', 'utf8');
  assert.match(await read('index'), /class="site-countdown"/);
  for (const place of places.filter(p => !p.area)) {
    const html = await read('travel-guide/' + place.slug);
    assert.ok(html.includes('<h1>' + place.name + '</h1>'));
    assert.ok(html.includes(place.detail));
    assert.ok(html.includes('href="/travel-guide?to=' + place.slug + '"'));
    assert.doesNotMatch(html, /class="site-countdown"|Enable JavaScript/);
    for (const nearby of place.nearby) assert.ok(html.includes('href="/travel-guide/' + nearby + '"'));
  }
  for (const slug of ['travel-guide', 'visit-conamore', 'visit-conamore/conamore-is-a-place']) {
    assert.doesNotMatch(await read(slug), /class="site-countdown"/);
  }
});
