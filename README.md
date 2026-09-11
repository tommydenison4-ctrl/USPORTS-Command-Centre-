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


## V101
- Reverted the V100 second discovery/watchdog layer that interfered with desktop live behavior.
- Mobile resume now calls the exact same V93 discovery routine used by desktop.
- Mobile live updates use the existing V94 DOM patch poller only; no route/hash/page rebuild during normal polling.
- Retired flat V47 field is forcibly hidden; only the tilted 3D V97 field is shown in the modern live center.
- V99 player-stat parser retained unchanged.


V102 stability rebuild: removed competing V92/V93/V94/V97/V101 front-end live controllers and replaced them with one shared desktop/mobile live controller. One polling loop, one 3D field, DOM-only live patches, session-cached source/snapshot, stable scroll. Player rows now carry an explicit away/home side from Presto team-root order.


V104: hard scroll stability for live GameCenter. Live scrolling is persisted per game, restored after hard refresh/pageshow, polling only patches changed HTML, hidden play-by-play is not rebuilt, and live DOM updates never intentionally change scroll position.

## V105 live smoothness fixes
- Deterministic live win probability from score + game clock, identical on desktop/mobile for identical game state.
- Removed custom scroll restoration that caused iOS Safari/control-center resumes to jump to the top.
- Same-game route resumes no longer rerender the whole GameCenter.
- Live DOM patches preserve the visible viewport anchor when rows above it change.
- Retired live UI/field painters are quarantined while V105 GameCenter is mounted.
- Player-stat play-by-play fallback propagates possession across adjacent Presto rows and uses broader passing/rushing/receiving patterns.
