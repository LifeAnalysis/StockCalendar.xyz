---
id: 12
category: scoring
function: Smart Money Conviction Floor
status: active
related: [13, 32, 24, 42]
---
# SM Conviction Is Non-Negotiable

Mature age, clean concentration, and a monotonic uptrend together do **not** clear the bar without smart-money conviction. The 4-point score treats active SM count as a full component, not a tiebreaker — a token can pass every other gate and still land at 1/4 if Nansen returns zero active SM holders. This is the asymmetry the pipeline was rebuilt around after the 9-component v4 misranking: SM presence is the load-bearing edge, and proxies for it (age, holder distribution, price action) cannot substitute.

FROGE (Solana, pump.fun, 5 months old) is the cycle-defining counter-example. It cleared Rugcheck at 29 (>20 threshold), passed step 5 hard gates with top1=20.69% and top10=29.6% — clean by memecoin standards — and printed a monotonic h6 +115% uptrend. Every aggregate signal said "buy". Nansen returned 0 active smart-money holders, dropping the score to 1/4 and forcing REJECT. The rule is structural: without convicted holders carrying the position, age and concentration are just survivorship without thesis. A 5-month-old pump.fun token with no SM is a token that no informed wallet has chosen to be in — that's information, not noise.

## Claims

- Implements [[../pipeline.md]] 4-point score: `active_sm` is one of four full points, not a modifier on the other three.
- Supports [[../portfolio.md]] FROGE rejection: Rugcheck 29, top1 20.69%, top10 29.6%, h6 +115% monotonic — but 0 active SM → 1/4 → REJECT.
- Predates [[sm-conviction-recency]] — that page handles the *type* of SM (recent vs convicted); this page is the prior question of whether any SM exists at all.
- Extends [[sm-conviction-recency]] — second-order quality check sits on top of this presence check.
- Extends [[sm-exit-pattern]] — exited-SM kills are a special case of "no active conviction"; FROGE shows the zero-ever-touched case is equally fatal.
- DerivedFrom the v4 → 4-point rebuild rationale in [[../pipeline.md]] "Why 4-point score not 9-component v4" — bell-curve mcap weighting was what let SM-absent tokens score high; the 4-point score forbids that by construction.
- Contradicts the heuristic "5-month-old survivor with clean holders is safe" — survivor bias without SM conviction is not an edge.

<!-- sources:
- ../pipeline.md
- ../portfolio.md
-->
