# U SPORTS Football Game Centre V92

V92 fixes live kickoff discovery for AUS/Atlantic University Sport games.

- National live discovery now scans U SPORTS, OUA, Atlantic University Sport, AUS Presto, Saint Mary's and Mount Allison schedule sources.
- Dynamic Presto live pages are accepted for current 2026 dates instead of being hard-coded to September 6.
- The Live landing page polls every 5 seconds and automatically hands off to GameCast as soon as a verified live game appears.
- The selected GameCast polls the discovered live source every 5 seconds for score, clock, play-by-play and situation data.
- Existing EDT kickoff normalization is retained.

Deploy the full project so the `/api/live-games` and `/api/presto-live` serverless routes are updated.


V93: authoritative current-date live discovery, direct SMU Presto source coverage, and clickable live cards.
