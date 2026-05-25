---
name: BSC out-of-scope auto-skip
description: Pipeline scope is sol/eth/base/arb. BSC pools dominate trending (5/20 in cycle 6). Tag and skip at step 0 to save cycle noise.
type: gate
status: proposed
related: [strict-prefilter-gauntlet]
---

# BSC out-of-scope auto-skip

Pipeline scope per `pipeline.md` is **sol, eth, base, arb**. GeckoTerminal `/onchain/trending` returns global pools — BSC routinely takes 25-50% of slots (cycle 6: 5/20 = 25%).

Currently these are filtered manually after the fact, polluting the audit trail with `SKIP — bsc` rows that have no learning value.

## Rule (step 0 augmentation)

```
if pool.network NOT IN {"eth","base","arb","solana"}:
  → SKIP, do NOT log to verdict table
  → optionally bump trending pagination to backfill 4 in-scope slots
```

## Why not include BSC

- No agentcash safety scanner with BSC parity (OnchainExpat is EVM but unverified for chainId 56)
- Rugcheck.xyz is Solana-only
- Nansen `/tgm/holders` SM coverage on BSC is sparse vs eth/base
- Position management infra (Photon/Bullx) does not list BSC

This is a scope decision, not a quality judgment. BSC has real memecoins (RAVE $220M mcap in cycle 6 was up >3% h24 with 6k buyers — clean). They're outside our edge.

## Open question

Should we **page** trending until we hit 20 in-scope pools, or accept the smaller in-scope sample? Paging costs nothing extra ($0.01 per call regardless), but page=2 may be lower-quality trending. Recommendation: page=1 only, accept smaller sample.

## Sources

- `[[../../pipeline.md]]` (DerivedFrom — scope statement)
- `[[../../outputs/2026-04-28-cycle-6-verdict.md]]` (DerivedFrom — 5/20 BSC noise)
