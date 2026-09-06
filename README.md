# U SPORTS Football Game Centre V28

Pregame cleanup:
- removed the made-up matchup predictor and generated matchup analysis
- pregame GameCenters now use verified data only
- records, PF/PA, recent results, standings and leaders come from loaded schedule/gamebook data
- unavailable stats display as em dash instead of being estimated
- related stories come from the indexed media feed
- actual team image logos are restored anywhere the live surfaces previously used abbreviation badges
- automatic kickoff / first-live-event handoff remains

Important production step:
Cache authorized/current team logo assets locally in the final deployment instead of depending on remote third-party URLs.
