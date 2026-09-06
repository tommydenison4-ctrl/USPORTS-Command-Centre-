U SPORTS PRESTO LIVE V37

Changes from V36:
- Serverless function now bootstraps the official OUA game page first, preserves public cookies, and discovers the current Presto liveupdate e/h parameters when they are exposed by the page.
- Falls back to the verified McMaster-Guelph e/h pair captured from the public live page.
- Uses same-origin-style request headers without credentials, authentication, or bypassing access controls.
- Pregame status panel now exposes the actual API failure message so deployment problems are visible immediately.
- McMaster/Guelph logos remain embedded.
- Field-goal posts remain removed from GameCast.
