# Confirmed player availability

`data/player-availability-usports.json` contains game-specific official reports. Empty statistics, a missing name in passing/rushing leaders, rumours and questionable status must never create an out report.

Each report requires `gameId`, `date`, canonical `teamId`, exact `player` name, `status` (`out` or `active`), `confirmedAt` (ISO timestamp), `source` (official team URL), `sourceType: "official-team"`, and `verified: true`. Verify the article or lineup before adding a report. A later active report clears an earlier out report. Never fabricate reports for testing in this file.

Only the first ten Hec watch players in the verified watch snapshot are eligible, and its as-of date must precede the game. Refresh that snapshot as rankings change. Reports cannot affect another game, completed games, or captures made before the report. The provisional impact estimate uses role and production and is not empirically calibrated. It does not change the award ranking.

The browser refreshes confirmed forecast updates each minute. The shared live recorder applies the same adjustment to subsequent points while retaining the archived original baseline and earlier captures. No automatic injury news ingestion exists: verified official reports must be entered into the registry. A zero-stat player never triggers a penalty.
