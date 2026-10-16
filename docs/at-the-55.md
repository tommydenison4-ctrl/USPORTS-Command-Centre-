# At The 55 promotion

Approved event: York at Toronto, October 17, 2026 (`2026-10-17-york-toronto`). Game Day Live starts at 11 a.m. Eastern; football kickoff remains 1 p.m. EDT.

The homepage schedule card and this game's `#game=` / `#live=` center receive the promotion. No global banners, scoreboard branding, or other games are decorated. This is additive DOM decoration, with no changes to GameCast, score feeds, or navigation controllers.

The initial link is the official YouTube channel. `/api/at-the-55` checks its Streams listing every five minutes when requested, plus a fifteen-minute Vercel cron. A candidate must be from that channel, have Game Day Live and Toronto/U of T/Varsity Blues in its title, and have an actual/scheduled start on October 17 in America/Toronto. Ambiguous matches are rejected. The selected video is stored once in the existing private Vercel Blob store and retained as the postgame recording. The player uses that exact video ID, never the generic channel live redirect.

If YouTube blocks automated retrieval, provides an unexpected page format, omits an event-specific title/date, or the existing Blob credentials are unavailable, the channel link stays in place. Verify the endpoint's `video` field after publication. There is no livestream available as of the initial implementation. Player availability and embedding permissions remain controlled by the publisher.

Artwork provenance is recorded in `assets/partners/README.md`.
