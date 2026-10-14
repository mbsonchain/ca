# Visit Conamore

Map-based site for visitconamore.com. Static HTML, CSS and JavaScript; no dependencies or backend.

- `/`: supplied blank map on pure white, CONAMORE in Articulat Heavy CF at weight 900 with tight spacing, and Courier navigation. Both the map and title link to the guide. The shared header highlights home in pink; the map sits slightly lower, centered in the space between header and footer.
- `/travel-guide`: an enlarged map that stays within the screen on desktop and mobile. The 22 names from the supplied reference, with Sfiga corrected, plus the user-requested Island Formal marker in the central mountains. Mouse hover and keyboard focus reveal square previews. Mouse clicks open place pages; touch opens the preview first. Escape and the close control dismiss previews. Clicking or tapping white space toggles place names, including the white paper within the image; colored terrain and locations do not toggle them. The background is also a keyboard-accessible toggle. Names are separate text, with Orangepoint to the left and Freetown Formal to the right, constrained to remain on screen. Sant’Amore is offset 9px down and Orangepoint 9px up. No visible toggle or place index.
- `/travel-guide/<place>`: direct-linkable place pages with a map detail, geographic description and onward links.
- `/visit-conamore`: the existing collection copy, preserved verbatim from the original theme, under the same heavy CONAMORE wordmark as home. The wordmark links home. Content fits one screen, adjusting type and spacing to the available height; short screens use two text columns.
- `/mobile-preview`: 390 × 844 preview frame.

Home and travel guide use the same available map area and aspect ratio at every breakpoint, so navigation does not change the map's scale or center. The mobile homepage wordmark is centered vertically over that map area. Every entry to the guide starts with names hidden. Above 640px wide, Freetown's label sits 9px higher and Goldpoint's 9px lower; their dots and mobile label positions are unchanged.

Clicking outside an open location card dismisses it without changing name visibility. A subsequent white-space click toggles names normally. The dismissal guard covers mouse, touch, pen and keyboard activation, while preserving card controls, marker selection and navigation.

## Run

`npm run check` validates syntax. `npm test` checks white-space toggling, pixel coordinate mapping, label bounds and cleanup. `npm run build` creates `dist/`. `npm run dev` serves the built site at http://127.0.0.1:4175.

## Content and provenance

`places.js` holds the names, image coordinates, short descriptions and links. The first-pass descriptions are based on visible geography in the supplied reference, not new mythology. Hollywood retains its original caption. Place stories can replace these descriptions later.

`collection.js` contains the public-facing collection copy from the original theme settings. It is deliberately unchanged, including its original launch-date wording.

Assets:
- `conamore-map.png`: supplied `blank map 1.png`, copied without modification.
- `conamore-map-labelled.png`: supplied `map with text.png`, copied without modification.
- `conamore-collection-logo.png`: original standalone logo retained as an unused asset; the collection now uses the home wordmark.

The maps use a shared SVG display filter to lift the near-white paper texture to pure white without changing coordinates or resizing the source art. Dark and mid-tone channels remain unchanged. Both the blank and labelled versions use the same treatment. The original full-map archive page, captions and image are removed from the source and built output. Each build clears generated output before copying current assets, preventing stale pages or images from shipping.

All pages share home (left), formal (center, desertformal.com), and strikeout (right, strikeout.us) navigation. The current page is pink instead of underlined, including home in the homepage header. Mobile includes compact navigation, a bounded map layout and safe-area-aware footer spacing. Home, guide and collection stay within the viewport; detail pages retain normal scrolling. The former `/travel-guide/sfsga` address redirects to `/travel-guide/sfiga`.

The existing Adobe Fonts kit is used for the homepage title. The kit registers the real 900 face under the separate `articulat-heavy-cf` family. Footer and small interface text use Courier New/Courier, matching the current website interface. No font binaries are redistributed.

## Release and verification

The user authorized the first production release on 14 October 2026, including the heavier CONAMORE title. Production deploys from `main` through the existing Vercel integration. No Shopify data, credentials, theme backups or private store exports are included.

Syntax validation and static output/link checks pass. Initial browser QA was blocked because the browser could not verify its admin-enforced security policy. Visual appearance and touch interaction still need a browser review.
