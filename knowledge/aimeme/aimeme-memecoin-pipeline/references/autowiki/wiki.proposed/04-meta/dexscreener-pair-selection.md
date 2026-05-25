---
id: 41
category: meta
function: Select Correct DexScreener Pair
status: active
related: [21, 44]
---
# DexScreener Pair Selection

**Rule:** When pulling a token's live price/liquidity for the dashboard or pipeline, query `https://api.dexscreener.com/latest/dex/tokens/{address}` and select the highest-liquidity pair filtered by `chainId`. Do **not** use `https://api.dexscreener.com/tokens/v1/{chain}/{addresses}`.

## Why

The `tokens/v1` endpoint returns exactly one pair per token — DexScreener's "preferred" pair, which is *not* the deepest pool. For uPEG (eth) on 2026-04-28 it returned the V3 0.3% pair at $119k liquidity while the canonical V4 1% pool held $633k. Result: dashboard reported uPEG liquidity at $115.9K and portfolio.md said $756–825k — a 6.5x discrepancy that looked like the pool had drained.

The `latest/dex/tokens/{address}` endpoint returns the full pair list. Pick max-liq after a `chainId` filter.

## Trade-off

`latest/dex/tokens` is one HTTP call per token (no batching), versus `tokens/v1` which batches up to 30 addresses per chain in one call. For aimeme volumes (~15 tokens/cycle) this is negligible — `Promise.all` in parallel completes in well under a second and the freshness gain is worth the extra calls.

## Implementation note (dashboard/lib/market.ts)

```ts
const res = await fetch(
  `https://api.dexscreener.com/latest/dex/tokens/${candidate.address}`,
  { headers: { accept: "application/json" }, next: { revalidate: 60 } }
);
const body = (await res.json()) as { pairs?: DexPair[] };
return (body.pairs ?? []).filter((p) => p.chainId === candidate.chainId);
```

After collection, dedupe by `(chainId, baseToken.address)` keeping the entry with highest `liquidity.usd`.

## When v1 is still acceptable

If you only need a generic price tick and don't care which pool, `tokens/v1` is fine and cheaper. Liquidity-sensitive decisions (entry sizing, drained-pool detection, slippage estimates) require the full pair list.
