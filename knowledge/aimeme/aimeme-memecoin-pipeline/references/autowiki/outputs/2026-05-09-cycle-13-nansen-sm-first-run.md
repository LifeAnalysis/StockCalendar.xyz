# 2026-05-09 Cycle 13 — Nansen SM-First Run

Source: AgentCash/Nansen-first workflow at `2026-05-09 08:49 UTC`.

Budget: started `$0.1721`, ended `$0.0621`. Paid calls used: Nansen `/token-screener` strict pass (`$0.01`), Nansen `/smart-money/holdings` strict pass (`$0.05`), Nansen `/tgm/holders` for PRX (`$0.05`). Free Rugcheck and DexScreener were used for Solana safety and executable tape/liquidity.

## Workflow Used

This was not the v3.9 GT-first workflow. It used the better proposed branch:

1. Nansen multi-chain SM discovery first.
2. Strict prefilters: chain, mcap, age, liquidity, SM count/value, positive 24h SM balance change.
3. Free Rugcheck and DexScreener before any TGM spend.
4. Nansen TGM holder verification only for the best survivor.

## Summary

No BUY candidates.

| Token | Chain | Verdict | Main reason |
|---|---:|---:|---|
| SLOP | ethereum | REJECT | Strict screener positive flow but only 2 SM traders; known concentration issue from cycle 12 |
| MERIDIA | base | REJECT | Only 1 SM trader and tiny 6h flow |
| COSTANZA | base | REJECT | Negative SM netflow |
| HORN | ethereum | REJECT | 4 SM traders but net outflow `-$2,179` |
| UAP | solana | REJECT | Negative SM netflow and prior Rugcheck failure |
| PRATT | solana | REJECT | Rugcheck `score_normalised=16`, low LP-provider warning |
| HENTAI | solana | REJECT | Rugcheck score 1 but LP only 62.6% on young token; tape previously net outflow |
| PRX | solana | WATCH / ALMOST | 3 active SM, LP locked, but top holder 21.66% and top10 concentration too high |
| OGNOME | solana | REJECT | LP locked 0% |
| LIMINAL | solana | REJECT | SM balance growth but sell-heavy h1/h6/h24 tape |

## Discovery Pass 1 — Nansen Token Screener

Filter:

```json
{
  "chains": ["ethereum", "solana", "base", "arbitrum"],
  "timeframe": "6h",
  "filters": {
    "trader_type": "sm",
    "token_age_days": { "min": 0.25, "max": 14 },
    "market_cap_usd": { "min": 100000, "max": 2000000 },
    "liquidity": { "min": 50000 }
  },
  "order_by": [{ "field": "netflow", "direction": "DESC" }]
}
```

Results were weak. `SLOP` had +$2,318 buy-only flow but only 2 SM traders and had already failed cycle 12 on a 69% non-whitelisted contract holder. `HORN` had 4 SM traders but net outflow. No strict screener result justified TGM spend.

## Discovery Pass 2 — Nansen Smart-Money Holdings

Filter:

```json
{
  "chains": ["ethereum", "solana", "base", "arbitrum"],
  "filters": {
    "include_smart_money_labels": ["Fund", "30D Smart Trader", "90D Smart Trader", "180D Smart Trader"],
    "token_age_days": { "min": 0.25, "max": 14 },
    "market_cap_usd": { "min": 100000, "max": 2000000 },
    "holders_count": { "min": 3 },
    "value_usd": { "min": 5000 },
    "balance_24h_percent_change": { "min": 0.05 }
  }
}
```

This returned five Solana candidates:

| Token | Mcap | Age | SM value | SM holders | 24h SM balance change |
|---|---:|---:|---:|---:|---:|
| PRATT | $552.6K | 3d | $31.4K | 4 | +60.5% |
| HENTAI | $431.9K | 3d | $11.9K | 5 | +11.6% |
| PRX | $426.6K | 11d | $11.6K | 3 | +16.8% |
| OGNOME | $179.7K | 6d | $7.4K | 3 | +12.8% |
| LIMINAL | $753.2K | 5d | $5.8K | 4 | +243.9% |

## Candidate Detail

### PRATT (solana)

- Step 1 Nansen prefilter: PASS. 4 SM holders, $31.4K SM value, +60.5% 24h SM balance growth.
- Step 3 safety: FAIL. Rugcheck `score_normalised=16`, risk: low amount of LP providers, `lpLockedPct=96.49%`.
- Step 4 SM: not spent; free safety gate killed.
- Verdict: REJECT. Strong SM accumulation does not override a sub-20 Rugcheck safety score.

### HENTAI (solana)

- Step 1 Nansen prefilter: PASS. 5 SM holders, $11.9K SM value.
- Step 3 safety: FAIL/soft-kill. Rugcheck had no explicit risks but `lpLockedPct=62.62%`; age 3d, mcap >$300K.
- Step 4 SM: not spent; LP branch fails the young-token lock gate.
- Verdict: REJECT. Too little LP lock for a young Solana token.

### PRX / Praxis (solana, `9iR8Urs95yLeiajX3T6eYK9t4YBcLbrWS8pCKgoPFb7n`)

- Step 1 Nansen prefilter: PASS. 3 SM holders, $11.6K SM value, +16.8% 24h SM balance growth.
- Step 3 safety: PASS/Watch. Rugcheck `score_normalised=30`, `lpLockedPct=95.56%`, mint/freeze authority null. Warning: single holder 21.66%.
- Step 4 market/tape: MIXED. DexScreener deepest pair has ~$61.5K liquidity, FDV ~$423K, h24 +15.8%, but h6 -3.2%, h1 -1.8%, m5 -0.8%; h1 buys/sells 13/15.
- Step 4 SM TGM: PASS. 3 active SM holders:
  - 30D Smart Trader: ~$6.19K, +3.91M tokens in 24h, 1.46% ownership.
  - 180D Smart Trader: ~$3.94K, 0.93% ownership, no 24h change.
  - 180D Smart Trader: ~$1.41K, 0.33% ownership, entered within 7d.
- Step 5 hard gates: FAIL/penalty. Top holder 21.66% is below v3.9's 25% kill, but top holders are heavily concentrated: top two alone hold 38.96%, and top10 is far above the proposed 30% strict-prefilter cap.
- Step 5.5 score: roughly 2.5-3/4 depending whether strict concentration is applied as hard kill. SM count passes, LP passes, creator unknown/clean, netflow/tape is not monotonic.
- SM-exit penalty: none from TGM; all three SM holders still active.
- Verdict: WATCH / ALMOST. This is the only real Nansen-first survivor, but not a BUY. It needs concentration improvement and a positive h1/h6 tape recheck.

### OGNOME (solana)

- Step 1 Nansen prefilter: PASS. 3 SM holders, $7.4K SM value.
- Step 3 safety: FAIL. Rugcheck `lpLockedPct=0%`.
- Verdict: REJECT. LP gate kills before TGM spend.

### LIMINAL (solana)

- Step 1 Nansen prefilter: PASS. 4 SM holders, +243.9% 24h SM balance growth.
- Step 3 safety: PASS. Rugcheck score 1, no risks, `lpLockedPct=95.85%`.
- Step 4 market/tape: FAIL. DexScreener h1 buys/sells 111/332, h6 buys/sells 1155/1571, h24 buys/sells 6257/11620. Price h6 -13.7%, h24 -7.2%.
- Step 4 SM: not spent because tape failed before TGM.
- Verdict: REJECT. SM balance growth is being overwhelmed by sell-heavy market tape.

## Verdict

**0 BUY.**

Best candidate: **PRX**, but only `WATCH / ALMOST`. It is the first cleaner Nansen-holdings survivor from this run: 3 active SM, two 180D labels, locked LP, and a real website/social footprint. The blockers are top-holder concentration and weak live tape.

## Learning Hook

No new wiki article written. This run reinforces existing staged rules:

- `strict-prefilter-gauntlet.md`: SM >= 3 is necessary but not sufficient; concentration still blocks PRX.
- `aggregate-vs-instantaneous-meta-rule.md`: LIMINAL's huge SM balance growth is an aggregate signal contradicted by sell-heavy live tape.
- `cheap-gate-ordering.md`: Rugcheck killed PRATT, HENTAI, and OGNOME before TGM spend.
