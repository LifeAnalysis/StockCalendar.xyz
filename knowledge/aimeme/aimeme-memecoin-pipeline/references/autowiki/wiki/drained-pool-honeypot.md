# Drained-Pool Honeypot

**Pattern:** A token displays a violently positive price chart (h1/h6/h24 all in 4–5 digit % range) while its USD liquidity is effectively zero (sub-$100, sometimes literally $0). The displayed `priceUsd` is fictional — derived from the last fill on a pool with no remaining sell-side depth. Selling any non-trivial size moves price to ~0.

**Why this happens:** The deployer (or first whales) drain the SOL/ETH side of the pool after pump, leaving the token side intact. Aggregators continue to report a price because the AMM still has a `k=x*y` spot, but k is now microscopic — first sell wipes it. Net effect: any holder is locked in, the chart looks like a moonshot, the position is unrealizable.

## Diagnostic checks

- `liquidity.usd < $100` while `priceChange.h24 > +1000%` → near-certain drained pool.
- `mcap / liquidity > 100,000x` → exit-impossible regardless of chart.
- Top10 holders > 90% of supply usually co-occurs (one wallet dumped through, kept the rest).
- Volume spikes vanish within an hour; only stray bot pings remain.

## Canonical instances (aimeme paper-trading log)

- **NYANDOG** (sol, `6eY3KHPfe6Axbr3JdcDq24KwmYAVJjgaNXAcJFhip2U2`) — 2026-04-28 cycle 4. GT trending Solana #19. Top10 = 94.48%. Price $0.02650, FDV $26.5M, liquidity <$1. h24 = +50,426%. m5 had 254 sells from only 31 unique sellers (8 sells/seller bot dump). REJECTED at step 5 hard gate without spending a Nansen call.
- **PEPTIDE** (sol, `2fXcg8jZ7zByFhhdwPz7oyTjEpC7AsxdfbaAntsgAgzt`) — 2026-04-28. 6 active SM, 4 exited, mcap $436k, liquidity $0. Lesson: do not trust historical netflow once liquidity is zero — the SM signal is from a previous reality.

## Pipeline rule

- **Step 3 hard kill:** `liquidity.usd < $1,000` ⇒ REJECT regardless of any other signal. Even a recovering pool needs a thousand-dollar floor to be tradable on paper.
- **Step 5 hard kill:** `top10_pct > 90%` ⇒ REJECT regardless of liquidity. Concentration kills exits even if depth temporarily exists.

## Dashboard rule (added 2026-04-28)

`getMarketSnapshot` filters out non-position rows whose `liquidityUsd < $100`. Active positions are kept visible (you have to see your bag rot), but watchlist/pass tokens with drained pools no longer pollute the live table. The fictional NYANDOG +50,426% no longer dominates the "missed" strip.

## Why it's its own page

This is structurally different from `top-holder-dumping`. There, exit liquidity exists but a whale is bleeding into it. Here, exit liquidity does not exist. Both produce identical-looking charts; only the liquidity reading distinguishes them. The fix for top-holder-dumping is "wait it out / use limits"; the fix here is "do not touch, the position has no exit."
