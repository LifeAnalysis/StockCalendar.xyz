---
name: Cycle 10 Pipeline Run
description: Nansen AgentCash cycle using smart-money holdings + token-screener discovery, cheap safety gates, and TGM holder verification.
type: project
date: 2026-05-04T15:50+07:00
balance_start: $1.295475
balance_end: $1.085475
spend_observed: ~$0.21
---

# Cycle 10 — 2026-05-04 15:50 GMT+7

## Source

- Nansen `/smart-money/holdings` via AgentCash x402.
- Nansen `/token-screener` secondary discovery.
- GoPlus EVM safety, Rugcheck Solana safety, DexScreener pair liquidity.
- Nansen `/tgm/holders` deep checks only after cheap gates.

## Discovery

Strict Cycle-9 holdings filter returned zero candidates:

```json
chains: ethereum, solana, base, arbitrum
mcap: $300k-$5M
age: 0.25-60d
SM balance 24h change: >=5%
SM holders: >=3
SM value: >=$20k
```

Broadened holdings filter surfaced:

| Token | Chain | Mcap | Age | SM value | SM holders | Initial status |
|---|---:|---:|---:|---:|---:|---|
| BENAT | eth | $762k | 8d | $6.8k | 5 | deep-check |
| MOGGING | sol | $246k | 54d | $6.7k | 3 | rejected at LP gate |
| CHUD | sol | $1.69M | 25d | $38.9k | 3 | rejected at LP gate |
| SUEAAUAN | sol | $362k | 1d | $20.5k | 4 | deep-check |
| STACCANA | sol | $352k | 1d | $5.9k | 4 | rejected at momentum/LP gate |

Token-screener also surfaced many Base `0xadf...` tokens. `GRAFANA` matched the documented Cycle-9 typosquat/recidivist-creator pattern and was killed before any TGM spend.

## Detailed Scoring

### BENAT / bENAT (eth, `0x56d06158bb8d2e42a6c5994a9a12a5c6d642f064`)

```
├─ Step 1 pre-filter: PASS
│   mcap ~$1.26M, age 8d, deep DexScreener pair ~$209k liq.
│   h1 +2.8%, h6 +32%, h24 +171%; h1 buys/sells 9/2.
├─ Step 3 safety: PASS
│   GoPlus: honeypot=0, proxy=0, mintable=0, taxes 0, creator balance 0,
│   honeypot_with_same_creator=0, holder_count 1777.
├─ Step 5 hard gates: PASS
│   Non-contract top holder ~2.26%; creator not in top10; no visible bundle kill.
├─ Step 4 SM: 6 active smart/public holders, combined visible value ~$6.96k.
│   Several entries are recent; no strong convicted >7d holding pattern.
├─ Step 5.5 score: ~2.6-2.9/4
│   sm_pts: ~0.4 (SM value small vs ~$209k pool)
│   lp_pts: 0.5 (UniV4 / unknown lock, tri-state neutral)
│   netflow: 1.0 (positive current flow/price action)
│   creator: 1.0
│   recency: -0.3 (recent-only / no convicted cluster)
├─ SM-exit penalty: none
└─ VERDICT: WATCH / ALMOST
```

Reason: clean contract and real momentum, but the SM dollar weight is too small relative to pool depth and the LP component is unknown. Not a pipeline BUY.

### SUEAAUAN (sol, `7qbSRkHEKXioezZQZQQBdAU7Z6WJnHTDQSAEyDYpump`)

```
├─ Step 1 pre-filter: MIXED
│   DexScreener deepest pool ~$51k liq, mcap ~$352k, age ~1d.
│   h1 +13.5%, h6 +46%, h24 +951%; h1 buys/sells 329/269.
│   Nansen token-info 1d shows buy volume $1.266M vs sell volume $1.291M
│   and volume/mcap ~7x, above strict v4.0 healthy band.
├─ Step 3 safety: PASS
│   Rugcheck score_normalised 1, LP locked ~95.4%, no risks, mint/freeze null.
├─ Step 4 SM: 3 active SM holders
│   90D Smart Trader holds ~$10.3k / 2.99%, 30D Smart Trader holds ~$344,
│   another 30D Smart Trader holds dust. Signal is mostly one wallet.
├─ Step 5 hard gates: FAIL
│   Rugcheck full report exposes creator `FvYs...MNQWY`; a top holder token
│   account owned by creator holds ~3.02% and appears inside top10.
├─ SM-exit penalty: none; partial outflow from main SM but still active.
└─ VERDICT: REJECT
```

Reason: creator-in-top10 hard gate. Without that, this would have been a tempting C/D-tier momentum candidate, which is exactly why the cheap holder gate matters.

### MOGGING (sol, `5oq4zKetRkUMMrFtkWH7r1Q6HZJMsTjgCeU6isgYpump`)

```
├─ Step 1 pre-filter: MIXED
│   mcap ~$245k, DexScreener deepest pool ~$53k, h1 +5.5%, h6 -6.4%.
├─ Step 3 safety: FAIL / structural
│   Rugcheck: LP locked only ~6.56%, danger "Large Amount of LP Unlocked".
└─ VERDICT: REJECT
```

### CHUD (sol, `21rKrtBzibPAZHAHQRzGiGDSh7XimCKB2a8VgsjZpump`)

```
├─ Step 1 pre-filter: WATCH-like on mcap/liquidity.
├─ Step 3 safety: FAIL
│   Rugcheck score_normalised 29 but LP locked 0%.
└─ VERDICT: REJECT
```

### GRAFANA (base, `0xadf204f1bdf11c9e293a7e9bd096c264171e98be`)

```
├─ Step 3 GoPlus: FAIL
│   honeypot_with_same_creator=1.
│   token_name = "GRAFANA github.com/grafana/GRAFANA".
│   creator = 0xd95a366a2c887033ba71743c6342e2df470e9db9.
└─ VERDICT: REJECT
```

Reason: exact Cycle-9 typosquat OSS rug template.

## Verdict

**0 BUY signals.**

Best watch: **BENAT / bENAT**. Cleanest safety profile, real volume, enough active SM to keep watching, but not enough SM dollar conviction or LP certainty for entry.

Hard reject that looked tempting: **SUEAAUAN**. It had clean Rugcheck, real retail velocity, and one meaningful 90D Smart Trader, but creator-in-top10 killed it.

## Post-Verdict Action — Spray/Pray Paper Entries

User requested a small spray/pray allocation after the strict cycle produced zero clean BUY signals. This is logged as a **workflow deviation / D-tier experiment**, not a retroactive pipeline BUY.

| Token | Action | Entry | Size | Why picked | Why capped |
|---|---:|---:|---:|---|---|
| bENAT | ENTRY | $0.8975 | $50 D-tier / 55.71 bENAT | Best non-hard-kill cycle-10 survivor: GoPlus clean, deepest pool ~$207k, h6 +29.9%, h24 +170%, 6 active smart/public holders | SM value only ~$7k vs pool depth; no convicted cluster; UniV4 LP unknown |
| KIMCHI | ENTRY | $0.0000009640 | $50 D-tier / 51,867,220 KIMCHI | Dashboard market trigger: deepest pool ~$99k, h1 +11.6%, h6 +15.5%, h24 +16.3%, h1 buys/sells 17/7 | Market-only trigger; full GoPlus + Nansen SM re-vet required before any size-up |

SUEAAUAN remained **watch-for-learning only** despite stronger surface velocity because the creator-in-top10 Solana Rugcheck rule is a hard kill. MOGGING, CHUD, GRAFANA, and STACCANA remained rejected.

## Proposed Learning

Staged:

- `wiki.proposed/02-gates/creator-in-top10-solana-rugcheck.md`
- `wiki.proposed/04-meta/spray-sizing-discipline.md`
