> WHY: Specifies the v4.0 strict-prefilter AND-gate proposal — the exact threshold stack we are validating against live trending feeds before promoting it to the canonical pipeline.

# v4.0 Strict Prefilter Thresholds

The v4.0 prefilter is an AND-gate: a token must pass every condition simultaneously to be promoted to deep-scan. The design goal is to reduce trending-feed throughput from ~40 candidates per cycle to ≤2, with the bottleneck being mandatory smart-money confirmation.

## Gate Definition

- **Chain whitelist**: token chain must be one of `sol`, `eth`, `base`, `arb`.
- **Market cap band**: $100,000 to $2,000,000.
- **Age band**: 6 hours to 14 days since launch.
- **Liquidity floor**: at least $50,000 pooled.
- **LP locked or burned**: at least 80 percent.
- **Top-10 holder cap**: at most 30 percent.
- **Single non-CEX, non-LP holder cap**: at most 15 percent.
- **Holder count floor**: at least 500 unique holders.
- **Active Nansen smart-money wallets**: at least 3 (mandatory — not optional, not soft-weighted).
- **Volume-to-market-cap band**: 0.1x to 5x daily.
- **Bundle concentration cap**: under 15 percent.

## Mandatory SM Gate

The "active Nansen SM ≥ 3" condition is the rate-limiting filter. Most trending tokens fail this even when they pass the structural gates. This is the design intent — the v4.0 thesis is that smart-money confirmation is the highest-precision signal available on Solana memecoins and treating it as mandatory is what separates v4.0 from the looser v3.9 baseline.

## Live Validation — 2026-04-28

- Input universe: ~40 trending Solana pools across 1-hour-trending pages 1 and 2.
- Pass rate: 1 of ~40 = 2.5 percent.
- Sole pass-through: HENRY.
- Pass rate confirms the gate is operating at the intended selectivity.

## Sources

- Internal pipeline design session, 2026-04-28
- Calibrated against [[nansen-2026-token-framework.md]] and [[photon-bullx-gmgn-filter-settings.md]]
