# The Stands community integration

Curated public r/CISfootball links are in `community-data.js`. Links were checked October 14, 2026 using the original Reddit pages. These are selected community resources and an archived game discussion, not a live feed. Reddit rejected the public listing request with HTTP 403; the site does not depend on that endpoint. “Latest on Reddit” opens the community's latest listing directly.

All five entry points are implemented: three featured cards on the Game Centre home, The Stands under Explore plus the landing page link, team-page conversations and attributed recruiting resources, a dated game-thread link with Reddit search/browse fallback, and Share this game. Sharing opens Reddit's submission form with the public game URL and title; the visitor reviews and posts it. The site does not post automatically.

Only a post with the same game ID, date and both teams is attached as a verified game thread. A rematch gets a search fallback. Selected recruiting resources are fan-maintained and labeled as such. The team picker covers all existing programs, and conference/topic filters apply to selected posts. No copied comments, fabricated activity counts, or assumed live threads are shown.

To add a newly verified post, append its original title, canonical Reddit URL, author, category, teams and conferences to `community-data.js`. Game threads also need the exact schedule game ID and date. Links outside r/CISfootball are rejected by the renderer. Update the checked date only after verifying the affected links.

Validation: `node tests/community.cjs`; existing game podcast tests; browser navigation, filters, team picker, exact-game and rematch links, sharing URL, one section per page, and responsive widths 320–430px plus desktop.
