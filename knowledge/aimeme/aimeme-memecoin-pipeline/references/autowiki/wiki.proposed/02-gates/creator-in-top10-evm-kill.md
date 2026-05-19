---
name: Creator In Top10 EVM Kill
description: GoPlus creator_address matching any rank-1..10 holder = hard kill at step 5; UNICURVE cycle-7 evidence
type: gate
---

# Creator In Top-10 Holders — EVM Hard Kill

## Rule

After step 3 GoPlus safety scan, intersect `creator_address` with the top-10 `holders[].address` list. If the creator appears in the top 10, **REJECT (hard gate, step 5)** regardless of percentage.

## Why

Dev sniped own pool. Even at modest single-digit % (UNICURVE: 4.87%), the creator owning a top-rank position means coordinated dump risk and pre-launch insider distribution. The pipeline already encodes this kill at step 5 ("creator address in top 10 holders"). This article documents the EVM-specific implementation since GoPlus exposes both fields cleanly.

## Cycle-7 evidence — UNICURVE

```
contract: 0xd400a048b726eba969449b342dc7c0e74187c0de (eth)
creator:  0xf942fc5c0ca2a9c33fc1f4dc3a399118b66d1458
top10[1]: 0xf942fc5c0ca2a9c33fc1f4dc3a399118b66d1458 (4.87%)
```

UNICURVE otherwise looked tradeable: 527 holders, monotonic uptrend (h24 +20%, h6 +53%, h1 +17%, m30 +23%), no honeypot, no tax, open-source, not mintable, hidden_owner=0. Killed solely on creator-in-top-10.

## How to apply

```python
goplus = fetch("api.gopluslabs.io/api/v1/token_security/{chain_id}", contract)
top10 = sorted(goplus.holders, key=lambda h: h.percent, reverse=True)[:10]
if goplus.creator_address.lower() in {h.address.lower() for h in top10}:
    return REJECT("creator-in-top10")
```

## Edge cases

- Skip the check when creator is a known launchpad/factory contract (UniV4 PositionManager, Clanker factory, etc.) — those legitimately deploy on behalf of users.
- Skip when creator's percent is below 0.1% AND not in top-10 (already covered by the top-10 cut).
- Solana equivalent (Rugcheck) does not expose creator_address cleanly; this rule applies EVM-only.

## Related

- [[../portfolio.md]]
- [[../wiki/livo-launchpad-backdoor]]
- pipeline.md step 5 hard gates
