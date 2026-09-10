U SPORTS PRESTO LIVE V61

NEWS REFRESH FIX
- Added /api/news.js.
- News is no longer frozen at the embedded Sep. 5/6 index.
- On load, the app asks the backend for official football stories published in the last 14 days.
- The backend checks official athletics football pages, parses dated news links, deduplicates them, and returns newest-first JSON.
- The existing embedded news remains only as a fallback if a source is temporarily unavailable.
- Media hub, home news, team news, and matchup news repaint when fresh stories arrive.
- Refreshes every 15 minutes in an open browser; backend response is CDN-cached for 15 minutes.

DEPLOY
Upload the complete build because api/news.js is new.
