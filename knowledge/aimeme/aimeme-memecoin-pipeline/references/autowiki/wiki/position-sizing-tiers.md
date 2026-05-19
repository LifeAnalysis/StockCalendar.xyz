# Position Sizing Tiers (S/A/B/C/D)

Tier-based sizing v4.0: hard kills stay binary, score becomes size. Borderline candidates get a half-bet rather than a zero-bet. Five tiers (S/A/B/C/D) plus WATCH and HARD KILL, each with its own allocation, stop discipline, and take-profit shape.

| Tier | Score | Allocation | Stop | TP |
|------|-------|-----------|------|-----|
| S | 4/4 + convicted SM ≥3 (>7d) OR SM>10% pool | $200 | -30% trail | scale 50% @ +100%, runner 30% trail |
| A | 4/4 | $150 | -30% trail | same as S |
| B | 3.5+/4 (3 full + 1 partial) | $100 | -25% trail | scale 50% @ +75% |
| C | 3/4 (3 full + 1 missing/partial) | $75 | -20% tight | exit 100% @ +60% (no runner) |
| D | 2.5+/4 with LP locked + monotonic | $50 | -15% hard | exit 100% @ +40% |
| WATCH | <2.5 | $0 | — | — |
| HARD KILL | any | $0 | — | — |

Max simultaneous open positions: 12 (~$1,000–$1,500 deployed). Hard exit triggers across all tiers: top SM full exit, liquidity halves, creator wakes, mcap drops -50%.

## Claims

- Implements [[../portfolio.md]] "Position Sizing — Tier-based v4.0" table (allocations, stops, TPs verbatim).
- Implements [[../portfolio.md]] hard-exit-trigger list applied uniformly across tiers.
- Implements [[../portfolio.md]] max-position cap of 12 simultaneous positions.
- Supports [[../portfolio.md]] uPEG A-tier $150 entry at 3.0/4 re-tiered upward thanks to convicted SM concentration (41% of pool).
- Supports [[../portfolio.md]] ROO C-tier $75 entry at 3.2/4 (FOMO penalty kept it out of B-tier).
- DerivedFrom [[../onepager.md]] tier-sizing summary table.
- Extends [[sm-conviction-recency.md]] — convicted SM ≥3 is the gate that promotes 4/4 from A to S tier.
- Contradicts a binary buy-or-skip stance on borderline scores — the v4.0 philosophy is explicitly "borderline tokens get half-bet not zero-bet".

<!-- sources:
- ../portfolio.md sha256:0e801844cff851c649b9f840c278951f9533100f9270feb5037acdca61888691
- ../onepager.md sha256:ba1406fa670f91b11aa098665076efb1a7c00cedd45d05695abdf47377517379
-->
