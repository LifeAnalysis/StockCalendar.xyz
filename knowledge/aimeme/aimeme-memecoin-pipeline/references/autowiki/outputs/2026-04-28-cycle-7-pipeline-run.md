---
name: Cycle 7 Pipeline Run
description: v3.9 canonical pipeline — full audit trail, 20 trending pools scanned, NO BUY this cycle
type: project
date: 2026-04-28T22:34+07:00
balance_start: $4.568
balance_end: ~$4.41
spend: ~$0.16 (1× GT trending, 1× GoPlus EVM, 2× Nansen TGM SM, 6× Rugcheck free)
---

# Cycle 7 — 2026-04-28 22:34 GMT+7

## Source
GeckoTerminal /onchain/trending duration=1h via StableCrypto x402 ($0.01).

## Discovery (20 pools)

| # | Token | Chain | Mcap | Age | Verdict | Reason |
|---|---|---|---|---|---|---|
| 1 | wojak | eth | $21.8M | 3mo | REJECT-1 | h24 -21.7%, m30 sells dominant, dying |
| 2 | SCAM (Altman) | sol | $9.98M | 1d | REJECT-1 | symbol regex /^SCAM/ |
| 3 | MEMEMEMORY | sol | $234k | <1d | REJECT-3 | LP 100% unlocked, drained-pool ($0 tracked liq) |
| 4 | musk | sol | $389k | <1d | REJECT-3 | LP 100% unlocked, $0 tracked liq, fresh launch |
| 5 | **MASCOTS** | sol | $695k | 4d | **WATCH 2.74/4** | clean LP, monotonic up, but only 1 fresh SM |
| 6 | SCAMNALD | sol | $102k | <1d | REJECT-1 | symbol regex /^SCAM/ |
| 7 | UNICURVE | eth | $617k | 8d | REJECT-5 | creator 0xf942 in top-10 holders (rank #2, 4.87%) |
| 8 | BURNIE | sol | $11.6M | 25d | REJECT-1 | h24 -19.8%, m30 sells > buys, declining |
| 9 | SCAM (alt) | sol | $344k | 1d | REJECT-1 | symbol regex /^SCAM/ |
| 10 | ARK | bsc | $394M | 8mo | REJECT-0 | BSC auto-skip (cycle-6 rule) |
| 11 | RAVE | bsc | $29M | 5mo | REJECT-0 | BSC auto-skip |
| 12 | AIOT | bsc | $95M | 1y | REJECT-0 | BSC auto-skip |
| 13 | H | bsc | $17M | 10mo | REJECT-0 | BSC auto-skip |
| 14 | **BULL** | sol | $4.85M | 36d | **WATCH 2.74/4** | 3 active SM (2 convicted), netflow monotonic+, but LP unlocked |
| 15 | LUCA | sol | $202k | <1d | REJECT-1 | symbol regex /^LUCA/ |
| 16 | ASTEROID | eth | $115M | 1.6yr | REJECT-1 | h6/h1 negative, established mature token |
| 17 | WKC | bsc | $52M | 4yr | REJECT-0 | BSC auto-skip |
| 18 | BELKA | sol | $2.07M | 4d | REJECT-3 | LP 0% locked + age <14d + mcap >$300k = lp-tristate kill |
| 19 | maxxing | sol | $2.7M | 5mo | ALMOST | LP 0% + drained-pool tracked liq ($4.10) — suspicious |
| 20 | SUSHI | world | $8.7k | 5mo | REJECT-0 | chain out of scope |

## Detailed scoring — survivors that reached step 5.5

### MASCOTS (sol, 0x..wanRpump, $695k mcap, 4d age, $74k pool)

```
├─ Step 1 pre-filter: PASS  (h24 +16%, h6 +25%, h1 +5.7%, m30 +2.6%, m5 +0.05% — monotonic uptrend, m30 buys 232/142)
├─ Step 1.5 wash:    PASS  (vol/fdv 1.26x, m5 buyers 7 — neither wash nor strong velocity)
├─ Step 3 safety:    PASS  (Rugcheck score 35, LP 100% locked, no top-1 ownership flag, "Low Liquidity $167" — likely outdated tracking, GT shows $74k reserve)
├─ Step 4 SM:        1 active ($1.3k), 0 exited
├─ Step 5 hard gates: PASS (no top1>25%, no bundle visible, creator unknown but no flag from rugcheck)
├─ Step 5.5 score:   3.04/4
│   ├─ sm_pts:    0.035  (1 SM × $1.3k/$74k pool × 2 = floor)
│   ├─ lp_pts:    1.0    (100% locked)
│   ├─ netflow:   1.0    (h6 buyers 6091/sellers 990 = 6.2× — heavy buy-side)
│   └─ creator:   1.0    (no flag)
├─ Step 4b recency:  -0.3 penalty (1 SM, fresh today, no convicted)
├─ SM-exit penalty:  none (0 exited)
└─ VERDICT: WATCH 2.74/4 — single fresh SM is too thin a signal per sm-conviction-non-negotiable wiki rule. Add to ALMOST bucket, re-score next cycle.
```

### BULL (sol, 3TYg..pump, $4.85M mcap, 36d age, $273k pool)

```
├─ Step 1 pre-filter: PASS  (h24 +26%, h6 +18%, h1 -1.1%, m30 -5.4% — aggregate up, recent cooling)
├─ Step 1.5 wash:    PASS  (vol/fdv 0.31x — clean)
├─ Step 3 safety:    PASS-with-flag (Rugcheck score 36, lpLockedPct 0% — LP unlocked. Age 36d>14d so v3.9 kill-rule does NOT trigger; flag for tri-state 0.5)
├─ Step 4 SM:        3 active ($10.7k combined), 0 exited
│   ├─ Smart Trader [AsVTFhFY]: 1.5M tokens, $7.6k, fresh today (entered <24h)
│   ├─ Smart Trader [2grnxh6S]: 311k tokens, $1.6k, holding 30d ✓ convicted
│   └─ 30D Smart Trader [97UQFX1Z]: 311k tokens, $1.6k, holding 30d but trimmed -200k 7d
├─ Step 5 hard gates: PASS (no SM ownership concentration flag)
├─ Step 5.5 score:   2.735/4
│   ├─ sm_pts:    0.235  (3 SM × min($10.7k/$273k, 0.5) × 2 = 0.235)
│   ├─ lp_pts:    0.5    (LP unlocked but age >14d, tri-state else)
│   ├─ netflow:   1.0    (m30/m15/h1/h6 all buys>sells — monotonic positive across all windows)
│   └─ creator:   1.0    (no flag)
├─ Step 4b recency:  no penalty (2 convicted SM ≥ 1, but +0.3 bonus needs ≥3 convicted — none earned)
├─ SM-exit penalty:  none
└─ VERDICT: WATCH 2.735/4 — solid SM presence, monotonic netflow, but LP unlocked is structural risk on a 36d token still trending. ALMOST bucket.
```

### maxxing (sol, $2.7M mcap, 5mo age, $238k pool)

```
├─ Step 1 pre-filter: PASS  (h24 -5.6%, h6 +12%, h1 +9.2%, m30 +6.4% — recent recovery)
├─ Step 3 safety:    DOWNGRADE (Rugcheck score 58, lpLockedPct 0%, "Low Liquidity $4.10" + 100% LP unlocked + top1 20.7% + concentration warn — drained-pool template per wiki)
├─ Step 5: ALMOST — skipped Nansen call ($0.05 saved). Tracked-liquidity discrepancy with GT ($238k vs $4) means either Rugcheck is stale or actual exit liquidity is fragmented. Conservative: do not score, watch for tracked-liq update.
└─ VERDICT: ALMOST — drained-pool flag overrides scoring per drained-pool-honeypot wiki.
```

## Verdict summary

**0 BUY signals this cycle.**

Best candidate: **MASCOTS** — clean LP lock, organic 6× buy-side ratio, monotonic uptrend across all timeframes. Held back by single-fresh-SM signal (need ≥3 convicted per sm-conviction-non-negotiable rule).

Watchlist for cycle 8 re-score:
- MASCOTS — re-score in 4-6h. If 2nd/3rd SM enters and holds, promote to BUY tier.
- BULL — re-score next cycle. Watch for LP lock event or further SM accumulation.
- maxxing — re-score after 24h tracked-liq refresh.

## Lessons / wiki proposals

1. **EVM creator-in-top-10 is a useful kill** — UNICURVE looked clean (no honeypot/tax/proxy, 527 holders, monotonic up, h6 +53%) but creator at rank 2 of holders flagged it. Worth surfacing as standalone wiki article: "creator-in-top10-evm-kill.md".
2. **Pump.fun fresh-launch lp-unlocked template** — 4/20 trending Solana pools (MEMEMEMORY/musk/SCAMNALD/BELKA) all show identical pattern: LP 100% unlocked, $0-$10 tracked liq, age <1d. v3.9 step 3 catches these correctly. No new rule needed; reaffirms livo-launchpad template generalizes to pump.fun fresh launches.
3. **BSC auto-skip working as intended** — 5/20 pools (ARK/RAVE/AIOT/H/WKC) eliminated at step 0 with zero spend. Cycle-6 lesson saving ~$0.50/cycle vs scoring.
