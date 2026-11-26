import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { places } from '../places.js';
import { interviewArticle, interviewPath } from '../collection.js';
import { renderArticle } from '../article.js';

test('towns and both interview URLs are static documents, and only home shows the countdown', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs']);
  const read = path => readFile('dist/' + path + '.html', 'utf8');
  const home = await read('index'), guide = await read('travel-guide');
  assert.match(home, /class="site-countdown"/);
  for (const html of [home, guide]) {
    assert.match(html, /class="map-canvas"/);
    assert.equal((html.match(/class="map-image"/g) || []).length, 2);
    assert.match(html, /class="map-layer transit-layer" hidden/);
  }
  assert.doesNotMatch(home, /class="hotspot"|class="trip-sheet"/);
  assert.match(guide, /class="guide-background"/);
  for (const place of places.filter(p => !p.area)) {
    const html = await read('travel-guide/' + place.slug);
    assert.ok(html.includes('<h1>' + place.name + '</h1>'));
    assert.ok(html.includes(place.detail));
    assert.ok(html.includes('href="/travel-guide?to=' + place.slug + '"'));
    assert.doesNotMatch(html, /class="site-countdown"|Enable JavaScript/);
    for (const nearby of place.nearby) assert.ok(html.includes('href="/travel-guide/' + nearby + '"'));
  }
  assert.doesNotMatch(guide, /class="site-countdown"/);
  const interview = renderArticle(interviewArticle, { highlightQuestions: false });
  for (const slug of ['visit-conamore', interviewPath.slice(1)]) {
    const html = await read(slug);
    assert.ok(html.includes(interview));
    assert.equal((html.match(/class="article-exchange"/g) || []).length, 11);
    assert.doesNotMatch(html, /class="site-countdown"|collection-introduction|interview-invitation|interview-return|Enable JavaScript/);
  }
});
