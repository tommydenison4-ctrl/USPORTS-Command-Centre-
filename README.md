U SPORTS PRESTO LIVE V38

Changes from V37:
- API now accepts the app slug, the OUA boxscore game id (20260906_zejw), or zejw as aliases.
- All aliases normalize back to the app game id 2026-09-06-mcmaster-guelph so frontend matching still works.
- This fixes the diagnostic 404 shown when testing /api/presto-live?game=20260906_zejw.
- Existing Presto discovery/fallback logic, logos, 10-second polling, and no-field-goal-post GameCast remain.
