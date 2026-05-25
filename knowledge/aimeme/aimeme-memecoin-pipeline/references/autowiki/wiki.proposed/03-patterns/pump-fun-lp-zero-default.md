---
id: 31
category: patterns
function: Recognize Pump.Fun LP-Zero Default
status: proposed
related: [22, 24, 33]
---
# Pump.Fun LP-Zero Default — Post-Graduation Tristate

Pump.fun is the dominant Solana memecoin launchpad in 2026. Tokens launch on an internal bonding curve and "graduate" to an external DEX once a price/mcap threshold is hit. The mechanics determine why most graduated tokens show LP-locked = 0 percent in trending feeds — and why a binary `lpLockedPct == 0 → reject` gate culls the entire post-graduation population.

## Graduation Mechanics

- Initial graduation threshold: $69,000 mcap on the bonding curve. DerivedFrom [[raw/pump-fun-graduation-mechanics.md]].
- At threshold, pump.fun injects $12,000 of liquidity as a Raydium LP and burns the LP tokens — that liquidity is permanently locked. DerivedFrom [[raw/pump-fun-graduation-mechanics.md]].
- Full graduation to PumpSwap (pump.fun's in-house AMM) occurs at the $75,000–$100,000 mcap band. DerivedFrom [[raw/pump-fun-graduation-mechanics.md]].
- Graduation rate: approximately 1 percent of all pump.fun launches ever graduate; the remaining 99 percent stall and decay. DerivedFrom [[raw/pump-fun-graduation-mechanics.md]].

## The LP-Zero Default

- Post-graduation tokens carry `lpLockedPct = 0` by default in third-party scanners. DerivedFrom [[raw/pump-fun-graduation-mechanics.md]].
- Reason: graduation to PumpSwap does not perform an automatic LP burn equivalent to the initial Raydium step — the creator must manually lock or burn the new LP, and most do not. DerivedFrom [[raw/pump-fun-graduation-mechanics.md]].
- Empirical confirmation: every Solana trending token under $500k mcap in cycle-4 returned `lpLockedPct: 0`. DerivedFrom [[raw/cycle-4-scan-results-2026-04-28.md]].

## Pipeline Implication

- A binary `lpLockedPct >= 80%` gate culls the entire post-graduation pump.fun population in the $100k–$500k mcap band — exactly the band our pipeline targets. DerivedFrom [[raw/cycle-4-scan-results-2026-04-28.md]].
- The fix: tristate gate `locked / burned-at-graduation / unlocked-post-graduation`, with the middle bucket treated as conditional-pass when other gates are clean.
- Extends [[lp-locked-tristate.md]] — that page introduces tristate for UniV4 false-negatives; this one extends the tristate to a second structural source on Solana.
- Supports [[strict-prefilter-gauntlet]] LP-gate clause that explicitly references tristate interpretation.
- Refutes any wiki claim that a Solana memecoin with `lpLockedPct: 0` is automatically a rug — the reading is the default state for ~99 percent of post-graduation pump.fun tokens.

<!-- sources:
- raw/pump-fun-graduation-mechanics.md sha256:2900765cf120f00ded8aed5b556fed1360114db4317ea1d76360705b3b0b5079
- raw/cycle-4-scan-results-2026-04-28.md sha256:40e6f008a45709b720e2d0604601a11c49ea6a86a7b4a560acb99980071ac74a
-->
