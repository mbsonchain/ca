# Visit Conamore

Map-based site for visitconamore.com. Static HTML, CSS and JavaScript; no dependencies or backend.

- `/`: supplied blank map on pure white, CONAMORE in Articulat Heavy CF at weight 900 with tight spacing, and Courier navigation. The original homepage composition is retained.
- `/travel-guide`: a smaller map that stays within the screen on desktop and mobile. All 22 names from the supplied reference remain mapped to the artwork. Mouse hover and keyboard focus reveal square previews. Mouse clicks open place pages; touch opens the preview first. Escape and the close control dismiss previews. Includes a names toggle and an accessible modal place index, which scrolls independently without moving the map.
- `/travel-guide/<place>`: direct-linkable place pages with a map detail, geographic description and onward links.
- `/visit-conamore`: the existing collection copy, preserved verbatim from the original theme, under the original CONAMORE logo with pink drawings.
- `/mobile-preview`: 390 × 844 preview frame.

## Run

`npm run check` validates syntax. `npm run build` creates `dist/`. `npm run dev` serves the built site at http://127.0.0.1:4175.

## Content and provenance

`places.js` holds the names, image coordinates, short descriptions and links. The first-pass descriptions are based on visible geography in the supplied reference, not new mythology. Hollywood retains its original caption. Place stories can replace these descriptions later.

`collection.js` contains the public-facing collection copy from the original theme settings. It is deliberately unchanged, including its original launch-date wording.

Assets:
- `conamore-map.png`: supplied `blank map 1.png`, copied without modification.
- `conamore-map-labelled.png`: supplied `map with text.png`, copied without modification.
- `conamore-collection-logo.png`: original standalone logo, copied unchanged from the saved theme's `conamore-mobile-logo.png`.

The maps use a shared SVG display filter to lift the near-white paper texture to pure white without changing coordinates or resizing the source art. Dark and mid-tone channels remain unchanged. Both the blank and labelled versions use the same treatment. The original full-map archive page, captions and image are removed from the source and built output. Each build clears generated output before copying current assets, preventing stale pages or images from shipping.

The guide, place pages and collection share home (left), formal (center, desertformal.com), and strikeout (right, strikeout.us) navigation. The current footer page is pink instead of underlined. Mobile includes compact navigation, a bounded map layout, a scrollable place-list dialog and safe-area-aware footer spacing. Collection and detail pages retain normal scrolling for their copy.

The existing Adobe Fonts kit is used for the homepage title. The kit registers the real 900 face under the separate `articulat-heavy-cf` family. Footer and small interface text use Courier New/Courier, matching the current website interface. No font binaries are redistributed.

## Release and verification

The user authorized the first production release on 14 October 2026, including the heavier CONAMORE title. Production deploys from `main` through the existing Vercel integration. No Shopify data, credentials, theme backups or private store exports are included.

Syntax validation and static output/link checks pass. Initial browser QA was blocked because the browser could not verify its admin-enforced security policy. Visual appearance and touch interaction still need a browser review.
