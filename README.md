U SPORTS PRESTO LIVE V48

Change from V47:
- Narrowed the Live Around U SPORTS rail from 420px to 300px on desktop.
- Reduced the inter-column gap slightly.
- Compacted live-card score and spacing so the rail stays readable without competing with the main GameCast.
- Mobile/tablet behavior remains unchanged: the rail stacks below the main GameCast under 1100px.

Deploy the full build as before.


V49: prevents cross-game snapshot contamination by validating source team IDs against the selected matchup and quarantining discovered games from the legacy generic poller. Dynamic discovered-game polling remains active.
