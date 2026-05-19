---
name: What Should I Buy Workflow
description: Default workflow for answering "what should I buy?" with AgentCash/Nansen, cheap safety gates, and explicit buy/watch/no-buy outputs.
type: project
version: 1.0
created: 2026-05-09
---

# What Should I Buy Workflow

Use this whenever the user asks:

- "what should I buy"
- "best ones to buy"
- "run buy workflow"
- "find buys"
- "what's the play"
- similar urgent buy/trade requests

This workflow is for memecoin candidate selection and paper/live-trade decision support. It does not replace human execution. The output must be a ranked action list, not just a scan report.

## Default Stance

The default answer is **NO CLEAN BUY** unless a token clears safety, executable liquidity, smart-money conviction, concentration, and live tape.

Use three action labels:

| Label | Meaning |
|---|---|
| CLEAN BUY | Passes hard gates, active SM is real, tape is positive, concentration sane |
| TINY SPEC | Buyable only as D-tier/risk-budget spray because one major risk remains |
| WATCH | Interesting, but needs a concrete trigger before entry |
| NO BUY | Rejected or skipped |

Never call something a BUY only because it has Nansen SM. Nansen is discovery, not permission.

## Budget Rules

1. Check AgentCash balance first: `npx agentcash@latest balance`.
2. If balance is below `$0.06`, say paid discovery is constrained and use free/local checks unless the user funds AgentCash.
3. Prioritize calls:
   - `$0.05` Nansen `/smart-money/holdings` first.
   - `$0.01` Nansen `/token-screener` only if holdings is empty or stale.
   - Free Rugcheck and DexScreener before any TGM spend.
   - `$0.05` Nansen `/tgm/holders` only for the top 1-2 finalists.
4. Do not spend on expensive safety scans if cheap gates already kill the token.

## Step 0 — Read Local Priors

Read before running:

- `pipeline.md`
- `autowiki/wiki/*.md`
- `autowiki/wiki.proposed/02-gates/strict-prefilter-gauntlet.md`
- `autowiki/wiki.proposed/02-gates/liquidity-source-disagreement-kill.md`
- latest `autowiki/outputs/*`
- `portfolio.md` if sizing or current holdings matter

Apply wiki/proposed gates as learned rules, but surface contradictions when they matter.

## Step 1 — Nansen SM-First Discovery

Primary call:

```bash
npx agentcash@latest fetch https://api.nansen.ai/api/v1/smart-money/holdings \
  -m POST \
  -b '{
    "chains":["ethereum","solana","base","arbitrum"],
    "pagination":{"page":1,"per_page":50},
    "filters":{
      "include_smart_money_labels":["Fund","30D Smart Trader","90D Smart Trader","180D Smart Trader"],
      "include_stablecoins":false,
      "include_native_tokens":false,
      "token_age_days":{"min":0.25,"max":14},
      "market_cap_usd":{"min":100000,"max":2000000},
      "holders_count":{"min":3},
      "value_usd":{"min":5000},
      "balance_24h_percent_change":{"min":0.05}
    },
    "order_by":[{"field":"value_usd","direction":"DESC"}]
  }'
```

If zero candidates, broaden in this order:

1. mcap max from `$2M` to `$5M`.
2. token age max from `14d` to `30d`.
3. SM value min from `$5K` to `$2K`.
4. holders_count min from `3` to `2`, but those can only be WATCH/TINY SPEC.

Optional sidecar:

```bash
npx agentcash@latest fetch https://api.nansen.ai/api/v1/token-screener \
  -m POST \
  -b '{
    "chains":["ethereum","solana","base","arbitrum"],
    "timeframe":"6h",
    "pagination":{"page":1,"per_page":50},
    "filters":{
      "trader_type":"sm",
      "token_age_days":{"min":0.25,"max":14},
      "market_cap_usd":{"min":100000,"max":2000000},
      "liquidity":{"min":50000}
    },
    "order_by":[{"field":"netflow","direction":"DESC"}]
  }'
```

## Step 2 — Free/Cheap Kill Gates

For every candidate, run chain-specific checks.

### Solana

Use Rugcheck:

```bash
curl -sS https://api.rugcheck.xyz/v1/tokens/<TOKEN>/report/summary
curl -sS https://api.rugcheck.xyz/v1/tokens/<TOKEN>/report
```

Hard reject if:

- `score_normalised < 20`
- `lpLockedPct < 80` for age `<14d` and mcap `>$300K`
- `lpLockedPct == 0`
- creator/top holder appears in top 10
- top1 non-LP holder `>25%`
- top10 concentration `>30%` under strict workflow
- explicit risk: creator rugged tokens, large LP unlocked, freeze/mint authority, suspicious transfer fee

### EVM/Base/Arb

Use cheap GoPlus/DeFi route:

```bash
npx agentcash@latest fetch 'https://defi.hugen.tokyo/defi/token?chain=<CHAIN_ID>&address=<TOKEN>'
```

Hard reject if:

- `is_honeypot=true`
- `is_mintable=true`
- `is_proxy=true` unless known safe
- `hidden_owner=true`
- `owner_change_balance=true`
- buy/sell/transfer tax `>5%`
- `honeypot_with_same_creator=1`
- creator in top 10
- top1 non-whitelisted holder `>25%`
- LP NFT/value controlled by creator and unlocked, unless explicitly treated as TINY SPEC

## Step 3 — Executable Liquidity + Live Tape

Use DexScreener full token endpoint:

```bash
curl -sS https://api.dexscreener.com/latest/dex/tokens/<TOKEN>
```

Select the deepest pair on the same chain. Reject or downgrade if:

- deepest executable liquidity `<$50K`
- Nansen liquidity differs from live executable liquidity by `>10x`; use the lower number
- h1 or h6 price is negative for a BUY
- h1 buys <= sells for a BUY
- m5/m15/m30 show active dump against a positive h24 aggregate
- volume/mcap is extreme and unique buyer/seller shape looks wash-like

BUY tape requirement:

- h1 positive
- h6 positive
- h1 buys > sells
- liquidity stable above `$50K`
- no active dump in m5/m15

If SM is strong but tape is weak, output WATCH with exact trigger.

## Step 4 — TGM Holder Verification

Only for the top finalist(s):

```bash
npx agentcash@latest fetch https://api.nansen.ai/api/v1/tgm/holders \
  -m POST \
  -b '{
    "chain":"<chain>",
    "token_address":"<token>",
    "label_type":"smart_money",
    "pagination":{"page":1,"per_page":25},
    "filters":{
      "include_smart_money_labels":["Fund","30D Smart Trader","90D Smart Trader","180D Smart Trader","Smart Trader"],
      "value_usd":{"min":1}
    },
    "order_by":[{"field":"value_usd","direction":"DESC"}],
    "premium_labels":true
  }'
```

Score SM:

- CLEAN BUY needs `>=3` active SM.
- Better if at least one is `90D` or `180D`.
- Best if named Fund/VC labels appear.
- Penalize recent-only SM.
- Reject/downgrade if exited SM > active SM and exited >= 3.
- Penalize if combined SM value is tiny relative to pool depth.

## Step 5 — Decision Rules

### CLEAN BUY

All must be true:

- no hard safety kills
- executable liquidity `>= $50K`
- active SM `>=3`
- at least one convicted SM (`90D`, `180D`, or Fund) OR SM value `>=10%` of pool
- h1 and h6 positive
- h1 buys > sells
- top1 non-LP holder `<=15%` preferred, hard max `25%`
- top10 `<=30%` preferred
- creator not in top10
- LP locked/burned or structurally acceptable

### TINY SPEC

Use when alpha is real but one serious risk remains:

- strong SM + strong tape, but LP unknown/unlocked
- strong SM + clean safety, but concentration borderline
- strong tape + clean safety, but SM count only 2

Sizing: D-tier only. No averaging down. Must include the risk in the first line.

### WATCH

Use when candidate is promising but missing a trigger.

Always include exact trigger, e.g.:

- "Buy only if h1 and h6 turn positive and h1 buys > sells."
- "Buy only if LP locks above 80%."
- "Buy only if top holder drops below 15% or stops distributing."
- "Buy only if a third active SM enters."

### NO BUY

Use for any hard kill or weak/noisy setup.

## Output Format

When the user asks what to buy, answer in this shape:

```md
## Buy List

1. TOKEN — ACTION
   Address:
   Size:
   Why:
   Main risk:
   Invalidates if:

2. TOKEN — ACTION
   ...

## No-Buy Rejects

- TOKEN: reason
- TOKEN: reason

## Spend / Data

- AgentCash start/end
- Paid calls used
- Report path
```

Keep it blunt. If nothing is buyable, say so first.

## Filing

After each run:

1. Write output to `autowiki/outputs/YYYY-MM-DD-cycle-N-buy-workflow-run.md`.
2. Append a short event to `autowiki/log.md`.
3. If a durable new pattern appears, write a concept page under `autowiki/wiki.proposed/`.
4. Do not write directly to `autowiki/wiki/`.
