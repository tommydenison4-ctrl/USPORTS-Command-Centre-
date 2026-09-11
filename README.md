# U SPORTS Football Game Centre V72

V72 adds:
- Correct playoff field sizes: OUA 7, RSEQ 4, Canada West 4, AUS 3.
- Conference playoff pages with current seed, cut line, IN/OUT status and model playoff probability.
- New Build a Matchup tool for any two U SPORTS teams.
- Matchup projection uses verified results, scoring margin, normalized offensive gamebooks when available, official Top 10 position, and optional home-field adjustment.
- Projected score, win probability, matchup category edges and data-coverage notes.

No Supabase is required. Deploy the full folder to Vercel.

## V75 logo fix
- Local `file://` previews now use the real external team marks directly instead of `/api/team-logo`, which cannot exist when opening index.html from Finder.
- Vercel deployments continue to use `/api/team-logo` first.
- If the proxy fails online, the image automatically retries the real upstream logo URL.
- Only after both sources fail does the UI fall back to a clean abbreviation tile, so Safari never shows a broken-image icon.


V77: Replaced raw PF/PA-heavy prediction with opponent-adjusted power. Model uses 30% opponent-adjusted current performance, 25% Elo, 15% strength of schedule, 10% conference strength, 10% historical/prior baseline, and 10% normalized gamebook efficiency. Historical prior decays as current-season sample grows. Top-10 rank is display-only to avoid double-counting Elo.
