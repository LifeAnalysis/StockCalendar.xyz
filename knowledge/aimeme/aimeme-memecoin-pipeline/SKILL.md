---
name: aimeme-memecoin-pipeline
description: Find and size memecoin trades with cheap safety gates.
version: 1.0.0
author: Gherardo Lattanzi + Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [memecoin, trading, discovery, nansen, rugcheck, nuvolari, yield]
    category: blockchain
    related_skills: [llm-wiki]
---

# AImeme Memecoin Pipeline Skill

Use this skill for memecoin discovery, buy/no-buy decisions, position sizing, and yield-routing context around Nuvolari. It does not execute trades by itself; it turns noisy discovery data into a blunt action list with explicit safety gates and required execution inputs.

The installed references are vendored into this repo under `knowledge/aimeme/aimeme-memecoin-pipeline/references/` so deployed agents do not depend on a local Desktop folder. Treat these references as project-specific trading doctrine, not generic crypto advice.

## When to Use

- The user asks what meme coin to buy, scan, watch, reject, or size.
- The user asks for meme discovery, smart-money discovery, or a pipeline run.
- The user asks whether a candidate is a clean buy, tiny spec, watch, or no-buy.
- The user asks to connect discovered meme opportunities to Nuvolari buy or yield flows.
- The user asks to update, query, reweave, or audit the AImeme AutoWiki.

## Prerequisites

- Use `read_file` for installed references under this skill directory.
- Use `web_search` and `web_extract` only when live market/context data is needed.
- Use `terminal` only for project commands or approved API/CLI checks.
- Use Nuvolari execution tools, when present, only after exact token/vault addresses, chain IDs, wallet EOA, and integer base-unit amounts are known.

Reference files:

- `references/buy-workflow.md` — primary "what should I buy?" workflow.
- `references/onepager.md` — pipeline summary and sizing doctrine.
- `references/autowiki/wiki/` — stable synthesized concepts.
- `references/autowiki/wiki.proposed/` — staged rules and patterns.
- `references/autowiki/outputs/` — previous run reports.
- `references/autowiki/config/CLAUDE.md` — AutoWiki operating rules.
- `references/price-history.json` — copied local price history snapshot.
- `references/code/dashboard-market.ts.txt` — source AImeme DexScreener market logic snapshot.
- `references/code/dashboard-market-route.ts.txt` — source market API route snapshot.
- `references/code/poll-prices.mjs.txt` — source price polling logic snapshot.

## How to Run

For a buy/discovery request:

1. Read `references/buy-workflow.md`.
2. Read `references/onepager.md`.
3. Read `references/autowiki/wiki/index.md` and the most relevant wiki concept pages.
4. If the user asks for live discovery, gather live candidates and run cheap kill gates first.
5. Return a ranked action list: `CLEAN BUY`, `TINY SPEC`, `WATCH`, or `NO BUY`.

For a yield request:

1. Identify whether the request is about memecoin proceeds, stablecoin parking, or vault entry.
2. Use Nuvolari live yield tools if available.
3. Require exact vault/output token address, source token address, source/destination chain IDs, wallet EOA, and integer amount before quote preparation.
4. Never present a quote as executed. Quote output is for the user wallet to sign.

For AutoWiki work:

1. Read `references/autowiki/config/CLAUDE.md`.
2. Follow the dry-run rule: propose updates under `wiki.proposed/`, never directly mutate `wiki/`.
3. Preserve citations, WHY gates, source hashes, and no-deletion policy.

## Quick Reference

Coordinator lanes:

| Lane | Responsibility |
|---|---|
| `discovery` | Finds candidates from GeckoTerminal/CoinGecko trending pools. |
| `tape` | Checks executable liquidity, deepest pair, h1/h6 tape, buys/sells. |
| `market_monitor` | Tracks known tokens for live price, PnL, liquidity, and hold/trim/exit hints. |
| `safety` | Runs Rugcheck for Solana and GoPlus for EVM hard-kill flags. |
| `smart_money` | Prepares paid AgentCash/Nansen holdings and TGM holder commands. |
| `execution` | Prepares Nuvolari quotes only after exact addresses and wallet inputs exist. |
| `learning` | Applies AutoWiki rules and stages new lessons in proposed files. |

Action labels:

| Label | Meaning |
|---|---|
| `CLEAN BUY` | Safety gates pass, smart-money signal is active, tape is positive, concentration is sane. |
| `TINY SPEC` | Alpha is real but one serious risk remains; D-tier only. |
| `WATCH` | Interesting but needs a concrete trigger before entry. |
| `NO BUY` | Hard-killed, weak, or noisy. |

Sizing doctrine:

| Tier | Allocation | Stop | Take profit |
|---|---:|---|---|
| S | $200 | -30% trail | scale 50% at +100% |
| A | $150 | -30% trail | scale 50% at +100% |
| B | $100 | -25% trail | exit at +75% |
| C | $75 | -20% tight | exit at +60% |
| D | $50 | -15% hard | exit at +40% |

Hard stance:

- Default to `NO BUY` unless evidence clears safety, liquidity, smart-money, concentration, and tape.
- Smart-money is discovery, not permission.
- Cheap kill gates run before paid enrichment.
- Aggregate metrics lie; cross-check m5/m15/m30/h1/h6 where available.
- If tape is weak but signal is interesting, return `WATCH` with an exact trigger.

## Procedure

1. Orient from references.
   Read `buy-workflow.md`, `onepager.md`, `autowiki/wiki/index.md`, and relevant concept pages before forming a verdict.

2. Discover candidates.
   Prefer young tokens with real smart-money accumulation, executable liquidity, and non-obvious distribution. Do not spend on deep checks when cheap gates already kill the token.

3. Apply cheap gates.
   Reject honeypots, mintable/hidden-owner/proxy clones, creator/top-holder concentration, LP lock failures, drained pools, fake velocity, and aggregate-vs-instantaneous contradictions.

4. Verify liquidity and tape.
   Use the deepest executable pair. Downgrade if reported liquidity and executable liquidity disagree materially. A buy needs positive h1/h6 and h1 buys greater than sells.

5. Score smart money.
   A clean buy needs at least three active smart-money holders, preferably with 90D/180D/Fund conviction or meaningful value relative to pool depth.

6. Decide and size.
   Return `CLEAN BUY`, `TINY SPEC`, `WATCH`, or `NO BUY`. Include size, why, main risk, and invalidation.

7. Connect to Nuvolari when asked.
   For buys/swaps/yield entry, ask for exact addresses and integer base-unit amounts. Do not accept symbols as sufficient execution inputs.

8. File durable learning.
   If a new pattern appears, stage it in `references/autowiki/wiki.proposed/` format and explain that the user must review/merge.

## Output Format

Use this structure for "what should I buy?":

```md
## Buy List

1. TOKEN — ACTION
   Address:
   Size:
   Why:
   Main risk:
   Invalidates if:

## Watch

- TOKEN: trigger needed

## No-Buy Rejects

- TOKEN: reason

## Spend / Data

- Paid calls used:
- Missing inputs:
- Report/reference path:
```

Use this structure for Nuvolari entry/yield:

```md
## Route

| Step | Action | Required input |
|---|---|---|
| 1 | Select token/vault | exact contract address |
| 2 | Prepare quote | chain IDs, EOA, integer amount |
| 3 | User signs | wallet/account flow |
| 4 | Execute | quoteId + signatures only |
```

## Pitfalls

- Do not call a token a buy only because it appears in smart-money data.
- Do not ignore exited smart money; lifetime trader count can hide distribution.
- Do not average down tiny-spec entries.
- Do not use symbols where execution requires addresses.
- Do not call Nuvolari execute unless the user has provided signatures.
- Do not write directly into AutoWiki `wiki/`; use proposed updates.

## Verification

The work is complete when:

- The response has an explicit action label per candidate.
- Each buy/spec has a size and invalidation.
- Each watch item has a concrete trigger.
- Each no-buy has a hard reason.
- Any Nuvolari quote request lists exact missing execution inputs.
- Any AutoWiki change is staged, cited, and not directly merged.
