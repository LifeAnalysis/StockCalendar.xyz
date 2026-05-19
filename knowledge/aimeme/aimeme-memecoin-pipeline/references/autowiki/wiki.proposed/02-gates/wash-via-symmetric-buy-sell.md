---
name: Wash via symmetric buy-sell
description: Identical buy-count and sell-count across m5/m15/m30 with unique-buyer count far below buy count = wash bot. Hard reject at step 1.
type: gate
status: proposed
related: [wash-vs-real-velocity, monotonic-netflow-score]
---

# Wash via symmetric buy-sell

A wash bot ping-pongs the same liquidity between two wallets. Symptoms in GeckoTerminal trending response:

```
m5:  buys == sells, buyers ≈ sellers
m15: buys == sells, buyers ≈ sellers
m30: buys == sells, buyers ≈ sellers
unique_buyers << total_buys (e.g. 25 unique vs 127 buys)
```

Combined with high vol/FDV (HRP h1 vol $2.3M / FDV $398k = 5.8x), this is unambiguous wash. The token is being marketed via fake velocity to land on trending boards.

## Hard reject rule (extends v3.9 step 1)

```
WASH_SYMMETRIC if:
  abs(m5.buys - m5.sells) / max(m5.buys, m5.sells) < 0.10 AND
  abs(m15.buys - m15.sells) / max(m15.buys, m15.sells) < 0.10 AND
  abs(m30.buys - m30.sells) / max(m30.buys, m30.sells) < 0.10 AND
  m5.buyers / m5.buys < 0.30
→ REJECT
```

Add as step 1.5b alongside the existing m5_unique_buyers wash confirmation. The existing rule fires on `inflow_fdv_ratio > 20x AND m5_unique_buyers < 5`. This adds a second trigger that catches mid-velocity wash where ratio is 5-20x but buyer pool is tiny.

## Validation case

HRP (sol `3WZYy...`), 2026-04-28 21:30, h6 +1487%:
- m5: 127/127, 25 unique
- m15: 657/657, 25 unique buyers
- m30: 1494/1491, 29 unique
- vol/FDV h1: 5.8x

Killed by current pipeline only because vol/FDV > 5x (vol-to-mcap upper-band cap). The symmetric pattern is a stronger, lower-false-positive signal than the upper-band heuristic.

## Why this matters

Real Solana pumps have asymmetric m5/m15/m30 because retail FOMOs in spurts. Wash is mechanically symmetric because the same pair of wallets ping the pool every block. Adding this rule shifts wash detection from "flag on velocity outlier" (which over-rejects real pumps) to "flag on velocity outlier OR mechanical symmetry" (which catches more wash without over-rejecting MASCOTS-tier real growth).

## Sources

- `[[../../outputs/2026-04-28-cycle-6-verdict.md]]` (DerivedFrom — HRP case)
- `[[../wash-vs-real-velocity.md]]` (Extends)
