# Football projection ranking rules

Verified 2026-10-12. The engine uses only conference regular-season games, including entered hypothetical results. Wins are worth two standings points in every conference. RSEQ uses a coefficient when games played differ.

## Sources

- OUA: [user-selected 2025 Football Operations](https://www.oua.ca/sports/fball/2025-26/files/operations), §4.4–4.5 and Appendix C, plus [General Tie-Breaking Procedures](https://s3.amazonaws.com/oua.ca/documents/2020/9/24/OUA_Procedures_September_18_2020_.pdf), clauses 1, 3, 4, 6 and 7. The operations PDF is served through the View in Full Screen link on the official page.
- Canada West: [current operations directory](https://www.canadawest.org/insidecw/operations) → [2026–27 Football Regulations](https://www.canadawest.org/documents/playingregs/2026-27/Football_2026-27_-_-July_13_2026-_FINAL.pdf), §3.3–3.4. The cover says last updated June 23, 2026; the filename carries July 13, 2026.
- AUS: [2026–27 playing regulations directory](https://www.atlanticuniversitysport.com/about/member_info/playing_regs/index) → [Football](https://www.atlanticuniversitysport.com/about/member_info/playing_regs/SECTION2-PlayingRegulations-2026_FB.pdf), page 1 tie-breaking and definitions, amended June 2026.
- RSEQ: [2026–27 football regulations](https://rseq.ca/media/1095312/2627_uni_fb_reglements_specifiques_en.pdf), §4.1–4.2, refers to [2026–27 University Sector Rules](https://rseq.ca/media/875453/2627_uni_reglements_secteur.pdf), §15.1–15.2 and the FB column of the table on page 25.

## OUA

Most league wins when games played are equal; head-to-head record and capped point difference if every tied team has faced every other; division record; common-opponent record; record against other division teams from highest to lowest; division point difference; common-opponent point difference; point difference against each ranked opponent from highest to lowest; total point difference; coin toss or drawing of lots.

Every individual game’s differential is clamped to -25…+25. Records use winning percentages. Inapplicable head-to-head steps are skipped, not treated as missing information. Remaining ties restart from the beginning, and removed teams return to the common-opponent calculation. Ranked-opponent comparisons first resolve that opponent’s own standings tie; identical comparisons do not need arbitrary ordering.

## Canada West

Two tied teams: head-to-head record, head-to-head differential, full-season differential, coin toss. Three or more: head-to-head winning percentage, head-to-head differential, season differential. Determine the higher team and restart for the remaining group, using the two-team procedure when two remain. No points-allowed or points-scored fallback is authorized by §3.4. If a three-or-more-team group remains exactly equal after all three criteria, the published rule does not prescribe a statistical separation or a multi-team coin toss; the page asks for an explicit scenario order under a conference decision, rather than inventing an official rule.

## AUS

Head-to-head wins divided by losses; head-to-head points for divided by points against; season points for divided by points against; Sport Chair coin toss. After the highest team separates from a multi-team group, restart for the remaining group. A positive numerator divided by zero ranks above finite ratios. The former differential/common-opponent criteria were not the AUS 2026 rules and have been removed.

## RSEQ

Season win percentage; head-to-head win percentage; total head-to-head standings points; head-to-head PF/PA ratio; fewest season PA; season PF/PA ratio; winning percentage against ranked non-tied opponents from highest downward; PF/PA ratio against those opponents; agreed tiebreak match where possible; drawing of lots.

Reclassify tied groups, restarting for subgroups still tied. Forfeits count in the win record but are excluded from every PF/PA calculation. When coefficient standings apply, skip season PA and the agreed tiebreak match. Ratios are compared using exact integer cross-products so equivalent fractions do not become false splits.

## Incomplete scenarios and final external procedures

Winner-only picks count toward records. The engine stops only if its next applicable statistical criterion actually needs scores, and returns the exact game IDs. It does not skip missing required scores in favour of a later criterion. Blank, null, negative, fractional and equal final scores are not treated as real final results.

A conference coin toss/draw or agreed tiebreak-match result cannot be deduced from football scores. The page offers explicit scenario ordering only after the statistical sequence is exhausted. It marks that result as a scenario choice and saves it for that exact result signature. Changing a winner or score invalidates the saved choice.

The page shows the deciding rule and values, distinguishes a playoff-cut tie from clear IN/OUT status, and never assigns alphabetical seeds as an official tie-break.

## Verification

Run `node tests/playoff-tiebreaks.cjs`. Fixtures include circular ties, imbalanced comparisons, restarted subgroups, removed common opponents, ranked outsider ties, fourth/fifth opponent comparisons, score requirements, forfeits, coefficient exceptions and explicit final draws. Four hundred generated seasons also check invariance under reversed team/game inputs.
