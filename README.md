# Visit Conamore

Map-based site for visitconamore.com. Static HTML, CSS and JavaScript; no dependencies or backend.

- `/`: supplied blank map on pure white, CONAMORE in Articulat Heavy CF at weight 900 with tight spacing, and Courier navigation. Both the map and title link to the guide. The shared header highlights home in pink; the map sits slightly lower, centered in the space between header and footer.
- `/travel-guide` shows 20 towns. Click a town for Directions, Explore and its local departures. White space toggles the town names. Road directions include driving estimates, scheduled ferry crossings and posted closures. Rail & ferry directions use the current Pacific day's timetable. Lines marked In progress appear on the map and in station notices.
- `/travel-guide/<place>` serves a static page with the map detail, geographic description, directions link and nearby places.
- `/visit-conamore` opens the complete interview beneath the CONAMORE wordmark. All eleven DF/MS exchanges are readable in the initial HTML and scroll naturally.
- `/visit-conamore/conamore-is-a-place` serves the same interview for existing links.
- `/mobile-preview`: 390 × 844 preview frame. Add `?page=visit-conamore`, `?page=visit-conamore/conamore-is-a-place`, or `?page=travel-guide` to select a page.
- `/desktop-preview`: interactive 1440 × 900 desktop preview scaled to fit the browser panel, with the same optional `page` query parameter.

Desktop flowers: four copies of Matteo's pink flower sit in the guide's side margins at widths of 900px and above, with varied sizes and spacing inspired by his flower pattern. Each flower links to Visit CONAMORE and is keyboard accessible. The surrounding white space still toggles map names; following a flower also works while a location card is open. The map's size and center are unchanged. The text column is independent of the guide, up to 1000px wide on desktop and with 20px side margins on mobile. `assets/conamore-flower.png` is copied unchanged from the supplied `Desktop/desert formal/flower.png` (583 × 618, transparent PNG). A dedicated display filter lifts the dark outlines to soft charcoal, preserving the light pink/yellow colors and original transparency.

Home and travel guide use the same available map area and aspect ratio at every breakpoint, so navigation does not change the map's scale or center. The mobile homepage wordmark is centered vertically over that map area. Every entry to the guide starts with names hidden. Above 640px wide, Freetown's label sits 9px higher and Sfida's 9px lower; their dots and mobile label positions are unchanged.

Tapped location cards stay open after finger lift or focus changes until explicitly dismissed. Hover auto-close applies to mouse interactions. Clicking outside an open card dismisses it when the tap completes, without changing name visibility; a subsequent white-space click toggles names normally. The dismissal guard covers mouse, touch, pen and keyboard activation, while preserving card controls, marker selection and navigation. Regression checks exercise the actual card lifecycle, including unfocused touch buttons and delayed dismissal taps.

## Run

`npm run check` validates syntax. `npm test` checks white-space toggling, pixel coordinate mapping, label bounds and cleanup. `npm run build` creates `dist/`. `npm run dev` serves the built site at http://127.0.0.1:4175.

## Content and provenance

`places.js` holds the names, image coordinates, short descriptions and links. The first-pass descriptions are based on visible geography in the supplied reference, not new mythology. Hollywood retains its original caption. Place stories can replace these descriptions later.

`road-network.js` holds the traced centerlines and four ferry crossings. It records driving estimates and the affected segment, town names and map position for each posted closure. Legacy trip URLs can still supply additional closures. `transit.js` holds the daily train and ferry timetables and the rail alignments.

`collection.js` contains `interviewPath`, `interviewArticle`, and the shared interview page renderer. The interview was transcribed from Matteo's attached “Pasted text.txt” on 15 October 2026, preserving the speaker order and answer paragraphs except for the requested removal of DF's closing thank-you and the correction from “touch someone” to “touch something.” DF’s questions each form one paragraph. The answers use MS’s initials, and the artist’s name is spelled Bernini. Blocks support paragraphs (`type: 'paragraph', text`), questions with answers (`type: 'qa', question, answer`), and credited quotations (`type: 'quote', text, credit`). All content is plain text. `article.js` escapes it and renders the interview as unhighlighted questions beneath the CONAMORE page heading. Both interview URLs have a generated HTML entry. Browser history restores the reader’s scroll position.

Assets:
- `conamore-flower-sketch-1.svg` through `conamore-flower-sketch-5.svg`: original vector paths extracted from the supplied `Note Dec 25, 2025.pdf`, retaining the pink and yellow colors. The two page-one flowers, the colored flower and small lower-right flower on page two, and the page-three flower form the mirrored desktop columns. Crossed-out experiments are omitted.
- `conamore-map.png`: the supplied blank map with the retired southeast roads and town removed and Formal City drawn as a town.
- `conamore-map-labelled.png`: the revised atlas with the current town names for the no-JavaScript fallback.
- `conamore-collection-logo.png`: original standalone logo retained as an unused asset; the collection now uses the home wordmark.

The maps use a shared SVG display filter to lift the near-white paper texture to pure white without changing coordinates or resizing the source art. Dark and mid-tone channels remain unchanged. Both the blank and labelled versions use the same treatment. The original full-map archive page, captions and image are removed from the source and built output. Each build clears generated output before copying current assets, preventing stale pages or images from shipping.

All pages share home (left), FORMAL (center, desertformal.com), and strikeout (right, strikeout.us) navigation. The current page is pink instead of underlined, including home in the homepage header. Mobile includes compact navigation, a bounded map layout and safe-area-aware footer spacing. The interview uses document scrolling and a sticky header. The CONAMORE wordmark retains Articulat Heavy; interview questions and answers all use the same 14px Courier New/Courier size on desktop and mobile. Paragraphs, questions, exchanges, and the space below the logo have wider vertical spacing. CONAMORE is always uppercase in site copy, page titles, and navigation; URL slugs stay lowercase. Both former Sfiga URLs redirect to `/travel-guide/orangepoint`.

The existing Adobe Fonts kit is used for the homepage title. The kit registers the real 900 face under the separate `articulat-heavy-cf` family. Footer and small interface text use Courier New/Courier, matching the current website interface. No font binaries are redistributed.

## Saved flower version

The desktop and mobile interview flower layouts are preserved at tag `saved/conamore-interview-flowers-2026-10-15` (commit `501b24e4003eaaa09274f7a10ad712dac620553e`). This snapshot includes the introduction’s flowers and the latest interview copy corrections. A local source archive is also saved at `backups/conamore-interview-flowers-2026-10-15.zip`; backups are excluded from deployments.

## Release and verification

The user authorized the first production release on 14 October 2026, including the heavier CONAMORE title. Production deploys from `main` through the existing Vercel integration. No Shopify data, credentials, theme backups or private store exports are included.

Syntax validation and static output/link checks pass. Initial browser QA was blocked because the browser could not verify its admin-enforced security policy. Visual appearance and touch interaction still need a browser review.
