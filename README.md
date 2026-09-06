# U SPORTS Football Game Centre V34

This build fixes the deployment problem shown in V33.

## Why York returned HTTP 404
V33 expected `/data/rosters/york.json` and `/assets/teams/york.png` to already exist.
They only exist after the sync jobs run. The deployed project had never populated them.
The serverless `/api/roster` fallback was also not available in that deployment.

## V34 fix

Vercel now runs:

```bash
npm run build
```

before publishing. The build command:
1. crawls all 27 roster sources
2. writes static roster JSON to `data/rosters/`
3. downloads/converts team logos to `assets/teams/*.png`
4. keeps previously cached good data if an official source temporarily fails
5. creates a local fallback SVG so no logo slot disappears entirely
6. still deploys even if an individual school blocks automated access

`vercel.json` explicitly declares the roster serverless function and cache headers.

## Roster lookup order

The browser now tries:

1. `/data/rosters/<team>.json`
2. `/data/rosters/all.json`
3. `/api/roster?team=<team>`

So a broken API no longer means a blank roster if static data was built successfully.

## Logo lookup order

1. `/assets/teams/<team>.png`
2. `/assets/teams/<team>.svg`
3. configured remote image
4. abbreviation fallback

The SVG fallback is not represented as an official logo. It exists only so the UI never has a broken/missing image while a team's official asset source is being fixed.
