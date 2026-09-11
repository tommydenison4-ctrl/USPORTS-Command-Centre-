# U SPORTS Football Game Centre V92

V92 fixes live kickoff discovery for AUS/Atlantic University Sport games.

- National live discovery now scans U SPORTS, OUA, Atlantic University Sport, AUS Presto, Saint Mary's and Mount Allison schedule sources.
- Dynamic Presto live pages are accepted for current 2026 dates instead of being hard-coded to September 6.
- The Live landing page polls every 5 seconds and automatically hands off to GameCast as soon as a verified live game appears.
- The selected GameCast polls the discovered live source every 5 seconds for score, clock, play-by-play and situation data.
- Existing EDT kickoff normalization is retained.

Deploy the full project so the `/api/live-games` and `/api/presto-live` serverless routes are updated.


V93: authoritative current-date live discovery, direct SMU Presto source coverage, and clickable live cards.


V94: redesigned live GameCenter, projection at top, methodology banners removed, play-by-play collapsed by default, live individual/team box score views, and DOM-only polling to preserve scroll position during refreshes.


## V95
- Fixes live feed regression from V94 by moving the live-center renderer after the V93 AUS discovery controller.
- Saint Mary's/Mount Allison continues using the verified Presto source while V94-style UI patches in place.
- Live refreshes no longer replace the page or reset scroll position.

V98: Removed the late V97 route wrapper. V93 is again the sole owner of live routing, preventing a selected live game from falling back to pregame before discovery attaches the feed. No live API files changed.

V100 mobile-live resilience
- Added a viewport-independent live watchdog for iPhone/iPad Safari.
- Live source is cached in sessionStorage after discovery and restored immediately on refresh.
- Mobile foreground/pageshow/focus/online lifecycle events force an immediate live refresh.
- Existing V94 polling is exposed and reused so score/stats updates patch in place without route changes or scroll jumps.
- No changes to api/live-games.js or api/presto-live.js feed/discovery/parser behavior from V99.
