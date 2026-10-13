# Visit Conamore

Map-based site for visitconamore.com. Static HTML, CSS and JavaScript; no dependencies or backend.

- `/`: supplied blank map, CONAMORE in Articulat Heavy CF at weight 900 with tight spacing, and Courier navigation.
- `/travel-guide`: all 22 names from the supplied reference mapped to the artwork. Mouse hover and keyboard focus reveal square previews. Mouse clicks open place pages; touch opens the preview first. Escape and the close control dismiss previews. Includes a names toggle and an accessible place index.
- `/travel-guide/<place>`: direct-linkable place pages with a map detail, geographic description and onward links.
- `/visit-conamore`: the existing collection copy, preserved verbatim from the original theme.
- `/old-map`: recovered original drawing and all 15 original hover captions.
- `/mobile-preview`: 390 × 844 preview frame.

## Run

`npm run check` validates syntax. `npm run build` creates `dist/`. `npm run dev` serves the built site at http://127.0.0.1:4175.

## Content and provenance

`places.js` holds the names, image coordinates, short descriptions and links. The first-pass descriptions are based on visible geography in the supplied reference, not new mythology. Hollywood retains its original caption. Place stories can replace these descriptions later.

`archive.js` contains only public-facing copy from the original `page.conamore` theme settings. The original collection copy is deliberately unchanged, including its original launch-date wording.

Assets:
- `conamore-map.png`: supplied `blank map 1.png`, copied without modification.
- `conamore-map-labelled.png`: supplied `map with text.png`, copied without modification.
- `conamore-original.jpg`: original `SOS_site.jpg` from the store's public CDN, copied without modification.

The existing Adobe Fonts kit is used for the title. The kit registers the real 900 face under the separate `articulat-heavy-cf` family; CONAMORE uses that face on the home and collection pages. Footer and small interface text use Courier New/Courier, matching the current website interface. No font binaries are redistributed.

## Release and verification

The user authorized the first production release on 14 October 2026, including the heavier CONAMORE title. Production deploys from `main` through the existing Vercel integration. No Shopify data, credentials, theme backups or private store exports are included.

Syntax validation and static output/link checks pass. Initial browser QA was blocked because the browser could not verify its admin-enforced security policy. Visual appearance and touch interaction still need a browser review.
