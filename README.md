# U SPORTS Football Game Centre V33

This is the first roster-data / local-logo pipeline build.

## What changed

### Full player database
- `Roster` and `Players` tabs no longer use box-score participation to decide who exists.
- They load the complete official roster through:
  1. `/data/rosters/<team>.json` if a synced copy exists
  2. `/api/roster?team=<slug>` as the live serverless fallback
- Gamebook stats are matched onto rostered players by name.
- Players with no stats still appear and explicitly say `No recorded 2026 gamebook stats yet`.
- A new national **Players** navigation page can load any of the 27 programs.

### 27 roster sources
See `data/roster-sources.json`.
The parser supports SIDEARM, PrestoSports-style roster pages, and a generic fallback.

### Local logo pipeline
- The front-end tries `/assets/teams/<slug>.png` first.
- `npm run sync:logos` downloads/converts the configured marks into normalized transparent 256x256 PNGs.
- Remote URLs are only a fallback after the local file fails.

### Automatic updates
A GitHub Actions workflow runs daily:
`.github/workflows/sync-data.yml`

It:
1. syncs every roster
2. caches every logo
3. commits changed roster JSON / logo PNG files
4. Vercel redeploys automatically from the commit

## First deployment

```bash
npm install
npm run sync:data
git add .
git commit -m "Add full U SPORTS roster and logo pipeline"
git push
```

Then deploy the repo as its own Vercel project.

## Important
Some athletics sites may change markup or block automated requests. The sync logs report each team's player count so failed adapters can be corrected without inventing roster data.
