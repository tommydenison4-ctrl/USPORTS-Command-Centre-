# U SPORTS PRESTO LIVE V46

Fixes discovered-live-game navigation and persistence.

- Other live games in the right rail are now clickable/keyboard accessible.
- A discovered game is matched to the site's internal matchup ID, armed as a verified live GameCast, and opened directly.
- Dynamic Presto source pages are passed to the server-side proxy so games beyond McMaster-Guelph can load full score/clock/PBP/drives/field state.
- Manual navigation to a currently discovered live game now re-arms its live source automatically instead of falling back to pregame.
- The dynamic live source is polled every 10 seconds; national discovery refreshes every 20 seconds.

Upload the full build. Important files:
- index.html
- api/presto-live.js
- api/live-games.js
- vercel.json
- package.json
