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

## V106 live stability fixes
- Removed all programmatic scroll compensation from the live polling path. Live polls never call `scrollTo`, `scrollBy`, or rerender the GameCenter while mounted.
- Live 3D field now moves the football, line of scrimmage, and first-down marker from the current official spot/possession/distance.
- National out-of-town rail polls the same verified live discovery endpoint and patches scores in place.
- Presto individual-stat extraction now reads nested player category/stat objects rather than requiring flat scalar player rows.

### National schedule and shared forecasts

`https://en.usports.ca/sports/fball/composite` is the national index. The refresh job follows every date in the current season, normalizes OUA, RSEQ, AUS and Canada West games to the existing date/away/home IDs, and saves `data/national-schedule-usports.json`. Unassigned playoff slots and the East/West showcase are retained as normalized pending events; they receive no invented team profiles or probabilities. Unknown school names, failed date requests and missing conferences abort publication.

Presto play-by-play and official Sidearm gamebooks enrich only games in that index. Both adapters use the same eligible-play rules, team registry, history schema, prior-only training, and existing Advantage 60/35/5 blend. No conference-specific coefficients or strength bonuses enter forecasts. Build Matchup, dashboard/schedule cards, pregame GameCenter and team schedules call the shared `US_AWM.forecast` entry point. Missing history stays explicitly unavailable.

The scheduled refresh publishes the national schedule, profiles, forecasts and player-stat bundles together. Browser loading retains legacy venue metadata and verified finals when the index lacks scores, and does not convert already-Eastern kickoff times twice. Existing live feeds, completed-score fallbacks, out-of-town scoreboard and field/down-marker code remain in place; indexed boxscore links also feed the existing live adapter.

Validation: `python -m unittest discover -s scripts/advantage -p 'test_*.py'`, then `node scripts/advantage/check-national.cjs` and the existing `check.cjs`, `check-players.cjs`, `check-season.cjs`, and `check-ribbons.cjs`. Refresh with `python scripts/advantage/refresh.py` after installing `scripts/advantage/requirements.txt`.

### AUS conference strength

The shared JavaScript Advantage probability calculation applies an editorial AUS strength of **2/10** to all five AUS teams, including Bishop’s. Other conferences retain a neutral **10/10 baseline**, not a fitted strength rating. After the existing 60/35/5 blend, home win odds are multiplied by home strength / away strength. An otherwise 50–50 AUS matchup against another conference becomes 16.7% for AUS; same-conference probabilities are unchanged. This configured prior is not a historically calibrated estimate. Projected margin adds expected total × (adjusted home win probability − base home win probability), bounded by the total to keep both scores nonnegative. This editorial score adjustment preserves the expected total and leaves equal-strength matchups unchanged. Build Matchup shows both strength ratings and before/after probability. Saved historical pregame forecasts remain unchanged.

Build Matchup, schedule/dashboard, pregame GameCenter, team predictions and the Vanier neutral-field ranking all use this shared calculation. The Vanier view is a strength ranking, not a bracket simulation or literal championship probability; AUS teams are penalized, not assigned an artificial zero chance.

When the independent score regression contradicts the final U SPORTS win-probability favourite, the score is reconciled using the final home probability as the home share of the expected total. Agreeing score forecasts are retained. The reconciliation is disclosed in prediction details and applies through the same shared model to every prediction view. Team marks are restored on prediction cards and official news cards.

### Embedded podcasts

The Podcasts tab reads the fixed publisher RSS feeds for At The 55 through `/api/podcasts`. It displays eight latest published audio episodes per show, official feed artwork, publisher/copyright credits, RSS and subscription links. Audio streams directly from each publisher with native controls, no autoplay and no audio preloading. The saved `podcasts-data.js` snapshot supplies episodes during a feed outage. Background sports data refreshes do not replace active players. If a publisher enclosure fails, a visible message directs listeners to the original publisher/subscription links. At verification time, At The 55 audio returned HTTP 206. Artwork and player rendering were verified; the in-app test browser crashed when starting audio, so full playback verification remains limited.

Run `node scripts/advantage/check-podcasts.cjs` for RSS parsing, URL, publication cutoff, duplicate and partial-failure checks.

Navigation uses one Players & Leaders view, with legacy player routes directed there. The obsolete Command Center button is removed; its old route returns to the schedule dashboard. Team Stats adds per-game passing/rushing/total yards from complete individual box-score tables and a separately labelled eligible-play sample showing offensive/defensive yards per game and per play, plays per game, big-play and no-gain rates, and scoring averages. Sample YPG is YPP × plays per game from the same covered-game window.
