# U SPORTS Presto Live V62

Fixes historical games that were still showing blank scores/data.

## What changed
- Historical games now hydrate from the normalized `RICH_GAMES` and `LIMITED_GAMES` data already bundled in the app before attempting any network rediscovery.
- This restores completed-game scores across OUA, RSEQ, AUS and Canada West wherever a normalized gamebook/result is already present.
- Full normalized games also populate quarter scoring, team stats and leaders in the Box Score view.
- The existing `/api/final-games` fallback remains in place for completed games that are not yet bundled locally, including the Sep. 6 OUA finals.
- V61 live news refresh and all live GameCast functionality are preserved.

Deploy the full project contents to the same Vercel project.
