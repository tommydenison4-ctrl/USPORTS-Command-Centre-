# Advantage Winner Model release — September 23, 2026

Built from USPORTS-Command-Centre- (d3f1e4a) for U SPORTS and COLLEGE-PRO-ANALYTICS (fc6ab00) for NCAA/NFL. These are local deployable builds, not a production deployment. Input snapshots are dated September 22, 2026.

## Included

Pregame win probabilities, projected scores, total, expected eligible plays, explosive plays, median yards and negative-play rates. Predictions appear on schedule cards and GameCentre views. Missing or ambiguous histories and TBD opponents remain unavailable. Market prices never enter the Advantage model. Original NCAA Week 4 workbook predictions and winning-requirement targets are retained separately, including their original rounded score versus continuous margin/total fields.

Current coverage: all 62 upcoming U SPORTS fixtures, all 209 loaded NFL fixtures, and 632 named NCAA fixtures. Ten NCAA TBD fixtures remain unavailable. The original 71 NCAA forecasts match by Eastern calendar date and team identity, including late Friday games.

The shared fitted model follows the supplied Master Spec architecture: 60% football matchup, 35% power and 5% current form. Run explosives start at 15 yards, pass explosives at 20 yards, negative plays are eligible plays of zero or fewer yards. One turnover contributes two impact plays. Team profiles use up to eight prior completed games; no same-game results enter a pregame forecast. Scores are separately fitted, so the expected margin and most likely winner can differ.

## Reconstruction limits

AWM-V3-reconstructed-1 is a reconstruction, not a claim to recover undisclosed original coefficients. Football features, Elo power, clipped recent form, separate nonlinear margin, conditional scenario targets and live probabilities are fitted from collected historical feeds. The original workbook remains authoritative for its dated matchups.

U SPORTS has a small chronological validation sample. AUS profiles include older seasons and are marked accordingly. U SPORTS live probabilities use verified score, clock and pregame prior; full play-impact live features are not available from that adapter. NCAA/NFL use available verified play metrics. Overtime or missing clock states yield no live probability. Live projected scores use remaining regulation time; an explicit possession forecast and separately validated FBS/FCS bridge are not implemented. Cross-division results are not separately validated. Conditional explosive targets are descriptive associations, not causal guarantees. The 80% margin error band summarizes held-out residuals rather than a separately calibrated prediction interval.

## Historical checks

League | Training games | Holdout games | Winner accuracy | Brier | Margin MAE
---|---:|---:|---:|---:|---:
USPORTS | 132 | 44 | 61.4% | 0.228 | 17.0
NCAA | 1260 | 434 | 79.0% | 0.157 | 15.0
NFL | 442 | 151 | 64.9% | 0.226 | 10.8

These are retrospective chronological holdouts from the collected games, not prospective betting results or whole-league accuracy guarantees. Per-game holdout records and source links are included under data/. Missing feed coverage can affect representativeness.

## Deployment and future updates

Unzip the relevant build and deploy its root to the existing Vercel project. Keep the included api/ routes and vercel.json. There is no roster crawl, model fitting or dependency installation in the website build. HTML files embed local scripts, styles and prediction data; internet is still required for live feeds, remote logos and existing external services. U SPORTS server-backed feeds require the deployed ZIP; a local HTML alone cannot host server APIs.

A separate GitHub Actions workflow, advantage-refresh.yml, refreshes verified histories daily at 10:35 UTC and supports manual runs. It is included but has not been activated remotely. It requires repository Actions write permission. It updates profiles while retaining fitted coefficients, rejects material coverage regression, archives dated forecasts, and preserves already-generated pregame priors after kickoff dates. Refresh failure leaves the last deployed data usable. Existing site schedule discovery remains responsible for adding U SPORTS fixtures, and its exported schedule file should be updated when a new season is published.

To refresh locally: install scripts/advantage/requirements.txt with Python 3.12+, ensure Node 22+ and curl are available, then run python scripts/advantage/refresh.py from the repository. Train.py is included for reproducibility; coefficient refits should be reviewed and versioned before adoption. No API credentials are required for the public feeds used here. The scheduled workflow itself has not been run on GitHub.

## Verification

All 73 inline scripts and new browser scripts compile. Checks cover the 60/35/5 blend, strict missing-data handling, league/date matching, market exclusion, chronological train/test cutoffs, original workbook matching and real ESPN feed replay. Browser checks verified U SPORTS schedule/pregame views, NFL schedule/GameCentre and NCAA schedule/GameCentre. The inherited kickoff-time/live-state bug was corrected, and the retired synthetic NFL surface is hidden and its initial renderer disabled. No actual in-progress live game was available for an end-to-end broadcast test.
