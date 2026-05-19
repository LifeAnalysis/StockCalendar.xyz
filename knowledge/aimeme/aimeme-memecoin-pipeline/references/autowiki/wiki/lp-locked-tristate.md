# LP-Locked Tri-State

Pipeline v3.8 introduced a tri-state LP-lock signal — `locked / unknown / unlocked` — replacing the prior binary that punished any non-locked reading. The fix targets a specific false-negative class: Uniswap V4 pools (and similar venues) where lock data is structurally absent rather than indicative of an unlocked pool. Treating `unknown` as `unlocked` was killing real positions like uPEG.

The graduated mapping: `lp_pts = 1.0` if `lp_locked_pct >= 80`; `lp_pts = 0.0` only when `lp_locked_pct < 80 AND age_d < 14 AND mcap > 300_000` (the actual rug-prone profile); `lp_pts = 0.5` for `unknown` to avoid false-negatives, and `0.5` as the default neutral. This is a small but load-bearing piece of the v3.9 score because it decides whether new ETH UniV4 launches are score-eligible at all.

## Claims

- Implements [[../pipeline.md]] step 5.5 tri-state LP-lock scoring (`lp_pts ∈ {0.0, 0.5, 1.0}`).
- DerivedFrom [[../pipeline.md]] v3.8 changelog item 2: "LP locked tri-state — unknown ≠ unlocked (fixes UniV4 false-negatives like uPEG)".
- Supports [[../portfolio.md]] uPEG entry: scored 3.0/4 with LP unknown counted neutral (0.5) rather than 0, allowing A-tier sizing.
- Extends [[../pipeline.md]] step 5.6 edge-case: when rugcheck returns no LP data on Solana (non-pump.fun), treat lp_locked as PRESENT only if explicit lock detected, else UNKNOWN tagged for manual review.
- Contradicts the v3.7 binary lock interpretation that would have rejected uPEG.
- Supports [[../portfolio.md]] STOCKMAN rejection: LP 0% explicit + h6 -52% — the actual unlocked-and-failing profile the `0.0` branch is meant to catch.
- Supports [[../portfolio.md]] Skyler watch-state: LP 0% + age <14d + top10 >50% triggers `lp_pts = 0.0` correctly.

<!-- sources:
- ../pipeline.md sha256:1cc4df05330ada2e3d3144737ed904145b0be76927f6d7ab8696b80be59ccc17
- ../portfolio.md sha256:0e801844cff851c649b9f840c278951f9533100f9270feb5037acdca61888691
-->
