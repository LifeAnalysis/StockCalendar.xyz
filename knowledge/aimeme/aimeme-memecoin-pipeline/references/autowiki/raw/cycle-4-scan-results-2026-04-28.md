> WHY: Records the cycle-4 scan run on 2026-04-28 — the empirical pass/fail data validating v4.0 strict-prefilter thresholds against live Solana trending feeds, and surfaces the post-PumpSwap-graduation LP=0 pattern.

# Cycle 4 Scan Results — 2026-04-28

## Scan Scope

- Source feeds: NEW pools page 1, Solana 1-hour trending pages 1 and 2.
- NEW pools page 1 was discarded wholesale: every entry was under 1 minute old and was pump.fun-bonding-curve spam — no signal possible at that age.
- Solana 1-hour trending pages 1 and 2: ~40 pools triaged against the v4.0 strict prefilter.

## Pass

- **HENRY**: sole pass-through of the cycle.

## Top Failed Candidates

- **NYANDOG**: single non-CEX/LP holder at 78.3 percent of supply; LP locked 0 percent. Hard fail on concentration.
- **OPENLIE**: LP locked 0 percent. Hard fail on LP gate.
- **ANNIE**: LP locked 100 percent but unlocked, total liquidity only $831. Hard fail on liquidity floor ($50k).
- **xchat**: LP locked 0 percent. Hard fail on LP gate.
- **BELKA**: smart-money netflow -$5,261 over the window with 5 SM sells against 4 SM buys. Hard fail on SM directional bias.

## Systemic Pattern Observed

Every Solana trending token under $500k market cap returned `lpLockedPct: 0`. This is not a coincidence and not an aggregator bug — it is the post-PumpSwap-graduation default state documented in [[pump-fun-graduation-mechanics.md]]. Pump.fun graduates the bonding curve to PumpSwap without re-burning the new LP, so the creator must manually lock or burn it; most do not.

## Pipeline Implication

A binary `lpLockedPct >= 80%` gate culls the entire post-graduation pump.fun population in the $100k–$500k mcap band — exactly the band v4.0 is targeting. The gate must become tristate: `locked` / `burned-at-graduation` / `unlocked-post-graduation`, with the middle bucket treated as conditional-pass when other gates are clean.

## Sources

- Internal scan run, 2026-04-28, cycle 4
- DerivedFrom [[v4-0-strict-prefilter-thresholds.md]] and [[pump-fun-graduation-mechanics.md]]
