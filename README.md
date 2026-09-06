U SPORTS PRESTO LIVE V42

Changes from V41:
- Larger team logo/avatar treatment in GameCast.
- Stronger Presto score extraction plus play-by-play scoring fallback when explicit totals are absent.
- Parses down, distance, possession and spot from Presto play fields where available, with description fallback.
- Adds verified situational pills under the live scoreboard.
- Restores hero ribbons for notable verified plays: TD, turnover, FG, safety, blocked kick, explosive and first down.
- Keeps goalposts, demo controls and synthetic metrics removed.

Deploy: replace index.html and api/presto-live.js. Other files are unchanged but included for convenience.
