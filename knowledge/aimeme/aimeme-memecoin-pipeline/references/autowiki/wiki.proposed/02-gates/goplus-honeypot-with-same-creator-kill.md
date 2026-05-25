---
name: GoPlus honeypot_with_same_creator Kill
description: GoPlus flag honeypot_with_same_creator=1 = step-3 hard kill regardless of other green flags; PRISMA/NOCOBASE cycle-9 evidence
type: gate
---

# GoPlus `honeypot_with_same_creator: 1` — Step-3 Hard Kill

## Rule

If GoPlus token_security returns `honeypot_with_same_creator: "1"`, **REJECT (hard kill, step 3)** regardless of all other clean flags. The creator address has previously deployed at least one honeypot contract. Past behavior is signal.

## Why

A creator with prior-honeypot history reusing wallets to deploy new tokens is the cleanest serial-rug indicator GoPlus exposes. The new contract may itself read clean (no honeypot, no tax, no proxy, open-source) — that is the *trap*. The honeypot mechanism may be triggered by an admin call, a future ownership transfer, or by selling pressure crossing a threshold. The flag short-circuits the otherwise-clean appearance.

## Cycle-9 evidence — PRISMA + NOCOBASE

```
PRISMA   0xadf0d31463cb2f2a88dbf0bcb22964a7d5960c25 — creator 0xd95a366a... — flag = 1
NOCOBASE 0xadf61f225bc836d517c238ae3a08d2a5321b25c0 — creator 0xd95a366a... — flag = 1
```

Both surfaced at the **top** of Nansen's `/smart-money/holdings` endpoint with 9–10 SM holders accumulating $22k–$62k. Both showed clean GoPlus on every other field: `is_honeypot=0`, `is_proxy=0`, `is_mintable=0`, `hidden_owner=0`, `transfer_pausable=0`. Only `honeypot_with_same_creator=1` distinguished them as rugs. Without this gate, the SM signal would have produced a false BUY.

## How to apply

```python
goplus = fetch("api.gopluslabs.io/api/v1/token_security/{chain_id}", contract)
if goplus.get("honeypot_with_same_creator") == "1":
    return REJECT("creator-prior-honeypot")
```

Run this check **before** any Nansen TGM call — saves $0.05/token.

## Edge cases

- The flag is empty string (`""`) on some tokens, not `"0"`. Treat empty as unknown (do not kill on empty), kill only on explicit `"1"`.
- A flag of `"1"` does not imply the current contract is itself a honeypot — it implies the creator is recidivist. Hard kill applies regardless.
- `honeypot_with_same_creator` is EVM-only. No Solana equivalent through Rugcheck.

## Related

- [[creator-in-top10-evm-kill]]
- [[../wiki/livo-launchpad-backdoor]]
- [[typosquat-oss-token-name-pattern]]
- pipeline.md step 3 hard kills
