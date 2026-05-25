---
id: 42
category: meta
function: Apply Nansen Liquidity Thresholds
status: proposed
related: [24, 12, 35, 23, 43]
---
# Nansen 2026 Mcap, Liquidity, and Distribution Thresholds

Nansen's 2026 Solana token framework publishes specific numeric thresholds that act as the external benchmark our pipeline gates calibrate against. Capturing the framework as its own concept lets every other wiki page cite a single canonical source for "what does the industry consider healthy" rather than restating numbers inline.

## Liquidity

- Memecoin liquidity floor: $100,000 minimum pooled — below this, slippage and exit-risk make positions unviable. DerivedFrom [[raw/nansen-2026-token-framework.md]].
- Mcap-to-liquidity ratio: > 50x is "danger" — illiquid relative to nominal valuation. DerivedFrom [[raw/nansen-2026-token-framework.md]].

## Holder Distribution

- Top-10 holder ceiling: ≤ 40 percent for a healthy token. Above 40 percent: rug-vector and coordinated-dump risk dominate. DerivedFrom [[raw/nansen-2026-token-framework.md]].

## Volume

- Healthy volume-to-mcap band: 10–30 percent daily. Below 10 percent stagnant; above 30 percent typically wash or insider distribution. DerivedFrom [[raw/nansen-2026-token-framework.md]].

## Exchange Flow

- CEX-deposit alert: > 5 percent of circulating supply moving to CEX deposit addresses in 24h is a sell-side warning. DerivedFrom [[raw/nansen-2026-token-framework.md]].

## Venue Concentration

- Single-DEX concentration: ≥ 80 percent of liquidity on one venue is a concentration-risk flag — single-venue failure collapses the market. DerivedFrom [[raw/nansen-2026-token-framework.md]].

## Smart-Money Conviction

- Coordinated-conviction signal: ≥ 10 Nansen-labeled SM wallets entering inside a 48-hour window indicates clustering, not noise. DerivedFrom [[raw/nansen-2026-token-framework.md]].

## How Our Pipeline Diverges

- Predates [[strict-prefilter-gauntlet]] — Nansen is the external prior; v4.0 is our calibrated tilt against it.
- Contradicts [[strict-prefilter-gauntlet]] on liquidity floor: v4.0 uses $50k, Nansen recommends $100k. v4.0 deliberately sits below to keep the candidate pool non-empty in the $100k–$500k mcap band; the gap is acknowledged technical debt.
- Supports [[sm-conviction-floor]] — the 10-SM-in-48h benchmark is the upper-rail version of our ≥ 3 active SM gate.
- Supports [[wash-vs-real-velocity.md]] — the 30 percent vol/mcap ceiling formalizes when sustained "volume" flips into wash-distribution territory.
- Supports [[top-holder-dumping.md]] — 40 percent top-10 ceiling is the looser industry benchmark; we run stricter.

<!-- sources:
- raw/nansen-2026-token-framework.md sha256:be7f91beb39e52ddaf7b3c420b23d7f56e84bfa018c003f719e391953dbb9dd2
-->
