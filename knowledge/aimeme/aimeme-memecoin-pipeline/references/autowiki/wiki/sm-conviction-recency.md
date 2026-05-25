# SM Conviction & Recency (Step 4b)

v3.9 splits active smart-money holders by holding age. `high_conviction_sm` = active SM that has held for more than 7 days; `recent_sm` = active SM that entered within the last 2 days. If a candidate has only recent SM and zero convicted holders, a `-0.3` FOMO penalty fires. If three or more high-conviction holders exist, a `+0.3` bonus applies.

The intuition: recent-only SM is indistinguishable from coordinated FOMO buying or paid promotion in its on-chain shape. Convicted SM (week-plus holding through volatility) is the actual conviction signal. The penalty/bonus is small (±0.3 on a 4-point scale) but tier-shifting at the margins — it's what dropped ROO from a 3.5/4 to a 3.2/4 and routed it to C-tier sizing instead of B-tier.

## Claims

- Implements [[../pipeline.md]] v3.9 change 12 (step 4b refinement): conviction/recency split with explicit ±0.3 deltas.
- DerivedFrom [[aggregate-vs-instantaneous-meta-rule.md]] — holding-age split is the time dimension of "active SM count" as an aggregate.
- Supports [[../portfolio.md]] ROO entry: "3 active vs 2 exited, FOMO -0.3 for fresh SM" → 3.2/4 → C-tier $75 sizing rather than B-tier.
- Extends [[sm-exit-pattern.md]] — the exit rule kills bearish distributions; this rule de-rates bullish-but-shallow conviction.
- Supports [[../portfolio.md]] uPEG re-tier: "10+ SM convicted" cited as the reason for A-tier promotion despite headline 3.0/4.
- Contradicts treating SM count as flat — the rule explicitly says recent-only is suspect, convicted is rewarded.

<!-- sources:
- ../pipeline.md sha256:1cc4df05330ada2e3d3144737ed904145b0be76927f6d7ab8696b80be59ccc17
- ../portfolio.md sha256:0e801844cff851c649b9f840c278951f9533100f9270feb5037acdca61888691
-->
