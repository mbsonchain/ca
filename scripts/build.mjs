import { mkdir, copyFile, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { places } from '../places.js';
import { renderTown, escape } from '../town-page.js';
import { homeClock } from '../countdown.js';

// Rebuild generated output from scratch so removed pages and assets cannot ship.
await rm('dist', { recursive: true, force: true });
await mkdir('dist/travel-guide', { recursive: true });
await mkdir('dist/visit-conamore', { recursive: true });
for (const file of ['app.js', 'places.js', 'collection.js', 'article.js', 'map-labels.js', 'place-cards.js', 'countdown.js', 'road-network.js', 'routes.js', 'transit.js', 'town-page.js', 'directions.js', 'directions-view.js', 'map-gestures.js', 'styles.css', 'mobile-preview.html', 'desktop-preview.html']) await copyFile(file, `dist/${file}`);
await cp('assets', 'dist/assets', { recursive: true });
const html = await readFile('index.html', 'utf8');
await writeFile('dist/index.html', html.replace('<footer class="site-footer">', '<footer class="site-footer">' + homeClock));
const pages = [
  { slug: 'travel-guide', title: 'Travel guide' },
  { slug: 'visit-conamore', title: 'Visit CONAMORE' },
  { slug: 'visit-conamore/conamore-is-a-place', title: 'Interview' },
  ...places.map(p => ({ slug: `travel-guide/${p.slug}`, title: p.name, place: p })),
  { slug: '404', title: 'Not found' },
];
for (const page of pages) {
  let content = html.replace('<title>CONAMORE</title>', `<title>${escape(page.title)} — CONAMORE</title>`);
  if (page.place) {
    content = content.replace('<main id="main" tabindex="-1"></main>',
      `<main id="main" tabindex="-1" data-place="${page.place.slug}">${renderTown(page.place)}</main>`)
      .replace('data-nav="guide"', 'data-nav="guide" aria-current="page"')
      .replace('Welcome to CONAMORE. Explore the places, the map and the collection.', escape(page.place.intro))
      .replace(/<noscript>[\s\S]*?<\/noscript>/, '');
  }
  await writeFile(`dist/${page.slug}.html`, content);
}
console.log(`Built CONAMORE with ${places.length} places and the collection.`);
