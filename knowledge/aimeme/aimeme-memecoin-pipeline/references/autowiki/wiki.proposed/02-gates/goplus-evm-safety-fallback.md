---
name: GoPlus EVM Safety Fallback
description: When OnchainExpat token-safety returns 404, use GoPlus public API as drop-in EVM safety check.
type: gate
status: proposed
related: [strict-prefilter-gauntlet, cheap-gate-ordering]
---

# GoPlus EVM Safety Fallback

OnchainExpat `/api/x402-crypto/token-safety` returned 404 across both `x402` and `x402r` variants on 2026-04-28 21:30 GMT+7. Pipeline.md "Wired tools" entry is stale. Verified fallback:

```
GET https://api.gopluslabs.io/api/v1/token_security/{chainId}?contract_addresses={addr}
```

- **Free**, no auth, no payment
- **Chain ids**: 1=eth, 8453=base, 42161=arb, 56=bsc
- Returns: `is_honeypot`, `is_proxy`, `is_mintable`, `is_open_source`, `holder_count`, top-10 `holders[]` with `percent` + `is_contract` + `is_locked`, `creator_address`, `creator_percent`, `owner_change_balance`, `slippage_modifiable`, `transfer_pausable`, `buy_tax`/`sell_tax`.

## Mapping to v3.9 step 3 hard kills

| v3.9 kill flag | GoPlus field |
|---|---|
| is_honeypot=true | `is_honeypot == "1"` |
| hidden_owner | `hidden_owner == "1"` |
| owner_can_change_balance | `owner_change_balance == "1"` |
| buy_tax / sell_tax > 5% | `buy_tax`, `sell_tax` (decimal string, "0.05" = 5%) |
| is_proxy AND not allowlist | `is_proxy == "1"` |

## Mapping to v3.9 step 5 hard gates

| Gate | GoPlus path |
|---|---|
| top1 ownership > 25% (excl. LP/contract) | `holders[0]` if `is_contract==0` AND `percent > 0.25` |
| creator in top10 | check `creator_address` against `holders[].address` |
| LP locked | `holders[].is_locked` on the pool LP entry |

## Validation case

CAS (base, `0xf1070...d6f67`), 2026-04-28 cycle 6:
- `holders[0]` = `0x7a39...3ed9`, `is_contract=0`, `percent=0.85`, `is_locked=0`
- → step 5 hard kill (top1 EOA 85%, unlocked)

GoPlus surfaced this single-line, $0 cost. OnchainExpat would have charged $0.10 and returned 404.

## Promotion criteria

Promote to canonical when:
1. v3.9 pipeline.md "Wired tools" updated to list GoPlus as primary EVM safety
2. Either OnchainExpat is fixed (re-test weekly) or formally deprecated
3. GoPlus tested against 5+ known kills (honeypots, proxies, top1 outliers) — currently n=1

## Sources

- `[[../../outputs/2026-04-28-cycle-6-verdict.md]]` (DerivedFrom)
- `[[../../pipeline.md]]` (Contradicts — current "Wired tools" lists OnchainExpat as live)
