import { mkdir, copyFile, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { places } from '../places.js';

// Rebuild generated output from scratch so removed pages and assets cannot ship.
await rm('dist', { recursive: true, force: true });
await mkdir('dist/travel-guide', { recursive: true });
for (const file of ['index.html', 'app.js', 'places.js', 'collection.js', 'article.js', 'map-labels.js', 'place-cards.js', 'styles.css', 'mobile-preview.html', 'desktop-preview.html']) await copyFile(file, `dist/${file}`);
await cp('assets', 'dist/assets', { recursive: true });
const html = await readFile('index.html', 'utf8');
const pages = [
  { slug: 'travel-guide', title: 'Travel guide' },
  { slug: 'visit-conamore', title: 'Visit Conamore' },
  ...places.map(p => ({ slug: `travel-guide/${p.slug}`, title: p.name })),
  { slug: '404', title: 'Not found' },
];
for (const page of pages) {
  await writeFile(`dist/${page.slug}.html`, html.replace('<title>Conamore</title>', `<title>${page.title} — Conamore</title>`));
}
console.log(`Built Conamore with ${places.length} places and the collection.`);
