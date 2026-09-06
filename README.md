U SPORTS PRESTO LIVE V41

Changes from V40:
- Fixes Presto score extraction across common score/line-score structures.
- Removes all field-goal posts from GameCast.
- Removes LIVE DEMO controls and all seeded/fake YPP, explosive, turnover, drive and success-rate values.
- Current Drive now shows only verified Presto drive fields; otherwise it explicitly stays blank.
- Score displays a dash rather than a false 0 when an upstream score is unavailable.
- Hides unverified ball/LOS/first-down field markers until field position is parsed from verified data.
- Changes the live rail to "No other verified live games" when McMaster-Guelph itself is active.
- Keeps the 10-second official OUA/Presto polling path from V40.

Critical files to replace: index.html AND api/presto-live.js
