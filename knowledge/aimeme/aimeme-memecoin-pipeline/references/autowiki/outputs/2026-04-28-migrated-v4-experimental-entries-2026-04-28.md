# Migrated: v4.0 Experimental Entries — 2026-04-28

Migrated from `wiki/v4-experimental-entries-2026-04-28.md` on 2026-04-28 per R4 (output separation). Original was a per-token narrative for HENRY and Dunald; the durable lesson is captured in `wiki.proposed/02-gates/strict-prefilter-gauntlet.md` and `wiki.proposed/03-patterns/vc-backed-dormant-revival-pattern.md`. Preserved here so nothing is lost when the user runs merge.sh.

---

# v4.0 Experimental Entries — 2026-04-28

**Why this page exists:** Two paper positions (HENRY, Dunald Tromp) were opened *below* the canonical v3.9 BUY threshold (score 2.0/4 and 2.3/4 respectively), explicitly as v4.0 strict-prefilter experiments. The hypothesis is that v4.0's stricter web-tilted prefilters compensate for the lower aggregate score. These entries accept expected-negative-EV in exchange for outcome data that informs v4.0 weight calibration.

## HENRY — `CJUrENDAuSm4FxxziUgftnUJqqXjm4VL1zhJgwXupump` (sol, Token2022)

- **Tier:** C ($75 allocation, 235,849 HENRY at $0.000318)
- **Score at entry:** 2.0/4 (below v3.9 BUY of 3.0)
- **Stop:** $0.000223 (-30%) · **TP:** $0.000509 (+60%)
- **Triggers:**
  - 3 active SM, including 1 fresh-24h 90D Smart Trader buyer +$5.2k
  - SM netflow +$6,728 24h on a token down -84% h24
  - LP 94.7% locked, $57k liquidity
- **Risks:**
  - Single holder 20.69% (just under hard-kill threshold)
  - Falling-knife pattern; SM accumulation thesis unproven
  - Same launcher as Dunald (emoji series) — correlated risk
- **Hypothesis:** Smart-money contrarian-accumulation on retail-capitulated drawdown can beat random noise even with sub-threshold aggregate score, *if* SM netflow is positive on a negative-h24 token (the contrarian filter).

## Dunald Tromp — `3hPjuKcU2Bs2hGnwrkNnYFnmkUbJNsaPpM6MzRH7pump` (sol, Token2022)

- **Tier:** D ($50 allocation, 190,840 DUNALD at $0.000262). Lowest-conviction tier.
- **Score at entry:** 2.3/4 (below v3.9 BUY)
- **Stop:** $0.000184 (-30%) · **TP:** $0.000420 (+60%)
- **Triggers:**
  - LP 99.98% locked, no rugcheck flags
  - 1639 holders, balanced 7d activity (8415 buy / 9083 sell)
  - Clean structural profile — website (dunaldtromp.fun) and X account exist
- **Risks:**
  - **Zero active SM** — no conviction signal at all
  - Single holder 20.8%
  - 7d sellers > buyers (slight distribution skew)
- **Hypothesis:** A clean-LP-locked retail-only meme can outperform pure noise on the strength of structural cleanliness alone. This is the harder hypothesis; if Dunald books a positive return, it argues for a retail-meme tier; if it stops out, it confirms SM conviction is non-negotiable (cf. `sm-conviction-floor.md`).

## Stop-band override

Both entries use a -30% stop, *overriding* the tier-default stops (-20% for C, -15% for D). Rationale: these are speculative entries on volatile pump.fun tokens where -20% / -15% would be inside the noise band and would stop out on bot-driven wicks. -30% gives the thesis a chance to breathe.

The dashboard's `inferStopPct` originally fell back to tier defaults because its regex `stop[^-\d]*(-\d+)%` choked on the price digits in `"Stop $0.000223 (-30%)"`. Fixed 2026-04-28 to `stop[\s\S]*?\(\s*(-\d+)%\s*\)` so the parenthesized override is read.

## What the experiment tests

After both close (stop or TP):

1. Did the contrarian SM-netflow filter (HENRY) produce a different outcome distribution than pure noise?
2. Did the clean-structure-no-SM filter (Dunald) produce anything other than a stop-out?
3. If HENRY wins and Dunald loses, v4.0 should weight SM-netflow higher and de-rank zero-SM regardless of structure.
4. If both lose, v3.9's 3.0/4 minimum stays as the hard floor.

Outcomes get appended to `portfolio.md` Closed Positions and the regression-after-30 dataset. Do not generalize before n >= 10 closed below-threshold entries.
