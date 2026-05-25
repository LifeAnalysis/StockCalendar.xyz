# 2026-05-09 Cycle 12 Pipeline Run

Source: AgentCash full cycle at `2026-05-09 08:45 UTC`.

Budget: started `$0.2421`, ended `$0.1721`. Paid calls used: StableCrypto GeckoTerminal trending x2 (`$0.02`, one response saved for parsing), Nansen token screener x1 (`$0.01`), cheap GoPlus/DeFi safety x4 (`$0.04`). Free Rugcheck was used for Solana candidates. OnchainExpat `$0.10` scans were skipped because no candidate survived cheaper gates.

## Summary

No BUY candidates.

| Token | Chain | Verdict | Main reason |
|---|---:|---:|---|
| aura | solana | SKIP | $59.3M mcap, outside memecoin range |
| UAP | solana | REJECT | Rugcheck score 1/100 and SM netflow negative |
| GAYTES | solana | REJECT | Rugcheck score 16/100, below hard-kill threshold |
| ALPHA | solana | REJECT | Rugcheck creator history of rugged tokens |
| HANTA | solana | REJECT | Rugcheck score 1/100, LP locked 42.5%, sell-heavy m5 |
| Bear | solana | REJECT | Rugcheck score 1/100, LP locked 75.4% on young token |
| elonmaxxing | solana | REJECT | Rugcheck score 16/100 despite strong tape |
| POGE | solana | REJECT | Rugcheck score 16/100 and recent m15/m30 dump |
| SLOP | ethereum | REJECT | Top non-whitelisted contract holder 69.1%; only 2 SM traders |
| UNICURVE | ethereum | REJECT | Creator is top holder at 6.5%; prior creator-in-top10 kill reconfirmed |
| HERMESOS | base | ALMOST / REJECT | GoPlus live UniV4 liquidity only ~$2.4k vs Nansen $97k |
| BLOCKTRONICS | base | REJECT | GoPlus live UniV4 liquidity only ~$5 despite Nansen $42k |
| APPLE | solana | REJECT | Rugcheck score 1/100, LP locked 71.7% |
| THREE | solana | REJECT | Rugcheck score 1/100, LP locked 0% |
| CHONKERS | solana | WATCH / ALMOST | Rugcheck 34/100 and LP 99.5%, but top10 >50%, only 2 SM |
| CLAWD | solana | REJECT | Rugcheck score 1/100 |
| TON/BSC/large-cap rows | ton/bsc/base | SKIP | Out of configured chain scope or outside size range |

## Candidate Detail

### UAP (solana, FDV ~$1.10M, age 1d)

- Step 1 pre-filter: FAIL. h24 +2969.9% masks h1 -19.0% and m5 sells 38 vs buys 18.
- Step 3 safety: FAIL. Rugcheck `score_normalised=1`, `lpLockedPct=53.27%`.
- Step 4 holders: not spent; killed by free safety gate.
- Step 4 SM: Nansen sidecar also negative: 1 SM trader, `netflow=-$3,133`.
- Step 5 hard gates: FAIL via safety and recent distribution.
- Step 5.5 score: max 0.5/4; SM negative, LP below 80, recent netflow weak, creator unknown.
- SM-exit penalty: not checked.
- VERDICT: REJECT. This is a trending-but-cooling Solana pump with a fatal free safety score.

### GAYTES (solana, FDV ~$252K, age 1d)

- Step 1 pre-filter: PARTIAL PASS. h6 +15.2%, h1 +8.2%, m5 buyers 80 vs sellers 37; m15 is negative.
- Step 3 safety: FAIL. Rugcheck `score_normalised=16`, below the `<20` hard-kill threshold, despite `lpLockedPct=100%`.
- Step 4 holders: not spent.
- Step 4 SM: not surfaced by Nansen top positive-flow sidecar.
- Step 5 hard gates: FAIL via safety threshold.
- Step 5.5 score: max 2/4 from LP and short-term netflow; SM absent, safety killed.
- SM-exit penalty: not checked.
- VERDICT: REJECT. LP lock does not override a sub-threshold Rugcheck score.

### ALPHA (solana, FDV ~$72K, age <1d)

- Step 1 pre-filter: FAIL. h1 -41.1% while h6 +113.6%; very young and volatile, m5 price -5.7%.
- Step 3 safety: FAIL. Rugcheck `score_normalised=79` but explicit danger flag: `Creator history of rugged tokens`.
- Step 4 holders: not spent.
- Step 4 SM: not surfaced by Nansen positive-flow sidecar.
- Step 5 hard gates: FAIL via creator-history danger.
- Step 5.5 score: not advanced.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Creator rug history is a hard kill even if the normalized score is high.

### HANTA (solana, FDV ~$3.41M, age 5d)

- Step 1 pre-filter: FAIL. h6 -24.5%, h24 -63.9%, m5 sells 148 vs buys 84.
- Step 3 safety: FAIL. Rugcheck `score_normalised=1`, `lpLockedPct=42.46%`.
- Step 4 holders: not spent.
- Step 4 SM: not spent.
- Step 5 hard gates: FAIL via free safety and LP profile.
- Step 5.5 score: 0/4 directionally.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Same conclusion as cycle 11, now with LP lock still under 50%.

### Bear (solana, FDV ~$595K, age <1d)

- Step 1 pre-filter: FAIL. h24 +1564% and h6 +91% are contradicted by m30 -13.3%, m15 -9.4%, m5 -3.2%.
- Step 3 safety: FAIL. Rugcheck `score_normalised=1`, `lpLockedPct=75.37%` on a young token over $300K mcap.
- Step 4 holders: not spent.
- Step 4 SM: not surfaced by Nansen positive-flow sidecar.
- Step 5 hard gates: FAIL via safety score and LP below 80%.
- Step 5.5 score: max 0.5/4.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Aggregate pump, recent cooling, fatal Rugcheck.

### elonmaxxing (solana, FDV ~$1.25M, age <1d)

- Step 1 pre-filter: PASS on tape. h6 +380%, h1 +21%, m5 buyers 140 vs sellers 34.
- Step 3 safety: FAIL. Rugcheck `score_normalised=16`, below threshold, risk: low amount of LP providers.
- Step 4 holders: not spent.
- Step 4 SM: not surfaced by Nansen positive-flow sidecar.
- Step 5 hard gates: FAIL via safety threshold.
- Step 5.5 score: max 2/4, safety overrides.
- SM-exit penalty: not checked.
- VERDICT: REJECT. This was the strongest GT tape, but the free safety gate killed it before paid SM spend was justified.

### POGE (solana, FDV ~$136K, age <1d)

- Step 1 pre-filter: FAIL. h1 +201.8% conflicts with h6 +56.0%, m30 -18.0%, m15 -25.3%, m5 -5.9%.
- Step 3 safety: FAIL. Rugcheck `score_normalised=16`, `lpLockedPct=99.95%`, risk: low amount of LP providers.
- Step 4 holders: not spent.
- Step 4 SM: not surfaced by Nansen positive-flow sidecar.
- Step 5 hard gates: FAIL via safety threshold.
- Step 5.5 score: max 1/4 from LP only.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Pump already rolling over, and Rugcheck remains below the hard floor.

### SLOP (ethereum, mcap ~$1.98M, age 2d)

- Step 1 pre-filter: PASS on Nansen sidecar only: 2 SM traders, 6h netflow +$2,318, buy-only flow.
- Step 3 safety: PASS on cheap GoPlus fields: honeypot false, mintable false, proxy false, taxes 0, owner/creator balance 0.
- Step 4 holders: FAIL. Top holder is an unlabeled contract at 69.06% and is not the Uniswap V4 pool manager; pool manager is separate at 16.14%.
- Step 4 SM: only 2 SM traders, below the 3-active-SM floor; no conviction split purchased.
- Step 5 hard gates: FAIL via top1 >25% non-whitelisted contract holder.
- Step 5.5 score: about 1.5/4 maximum; safety clean + LP unknown neutral, but SM floor fails and concentration kills.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Clean tax/proxy fields are not enough with a 69% unlabelled contract holder.

### UNICURVE (ethereum, mcap ~$311K, age 19d)

- Step 1 pre-filter: PARTIAL PASS on Nansen: 1 SM trader, +$2,318 netflow.
- Step 3 safety: PASS on cheap fields: honeypot false, mintable false, proxy false, taxes 0.
- Step 4 holders: FAIL. Creator address `0xf942...1458` holds 6.53% and is rank #1 holder. Holder count 493.
- Step 4 SM: 1 SM trader only.
- Step 5 hard gates: FAIL. Creator in top 10 remains a hard kill.
- Step 5.5 score: not advanced.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Cycle-7 creator-in-top10 rejection reconfirmed.

### HERMESOS (base, mcap ~$235K, age 26d)

- Step 1 pre-filter: PARTIAL PASS on Nansen: 1 SM trader, +$2,316 netflow.
- Step 3 safety: PASS on cheap fields: honeypot false, mintable false, proxy false, taxes 0, creator balance 0.
- Step 4 holders: no concentration kill after excluding the Base UniV4 pool manager at 31.16%; top EOA is 2.99%.
- Step 4 SM: FAIL. Only 1 SM trader.
- Step 5 hard gates: FAIL/ALMOST via liquidity source disagreement. Nansen reports `$96,956` liquidity, while GoPlus live UniV4 pool list shows the largest pool at only about `$2,407`.
- Step 5.5 score: about 1.5/4; clean contract + concentration okay, SM and live-liquidity confidence fail.
- SM-exit penalty: not checked.
- VERDICT: ALMOST / REJECT. Track as an endpoint-disagreement case, not as a buy.

### BLOCKTRONICS (base, mcap ~$77K, age 1d)

- Step 1 pre-filter: PARTIAL PASS on Nansen: 2 SM traders, +$1,737 netflow.
- Step 3 safety: PASS on cheap fields: honeypot false, mintable false, proxy false, taxes 0, creator balance 0.
- Step 4 holders: pool manager holds 52.75%; top EOA is 4.30%.
- Step 4 SM: 2 SM traders only, below floor.
- Step 5 hard gates: FAIL. Nansen reports `$42,254` liquidity, while GoPlus live UniV4 liquidity is only about `$5`.
- Step 5.5 score: not advanced.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Liquidity is not tradeable if the executable pool route is dust.

### CHONKERS (solana, mcap ~$258K, age 13d)

- Step 1 pre-filter: PARTIAL PASS. Nansen shows 2 SM traders, buy volume $929, sell volume $328, netflow +$601.
- Step 3 safety: PASS above hard floor: Rugcheck `score_normalised=34`, `lpLockedPct=99.48%`.
- Step 4 holders: WARN. Rugcheck flags single holder 20.70% and top10 >50%.
- Step 4 SM: FAIL. Only 2 SM traders, below the 3-active-SM floor.
- Step 5 hard gates: no top1 >25% kill, but top10 concentration remains a strong penalty.
- Step 5.5 score: about 2/4; LP + netflow pass, SM floor fails, concentration/creator unresolved.
- SM-exit penalty: not checked.
- VERDICT: WATCH / ALMOST. Best Solana survivor structurally, but not enough SM and too concentrated for entry.

## Skips

- `aura`: Solana but ~$59.3M mcap, far above the $20M memecoin discovery envelope.
- `USDUC`: Solana but ~$10.6M mature stablecoin-shaped meme with h1 -6.1%, no entry shape.
- `VIRTUAL` and `POD`: Base large-cap rows outside memecoin discovery range.
- TON and BSC rows: outside configured ETH/Base/Solana/Arb scope.

## Learning Hook

Wrote proposed wiki article: `autowiki/wiki.proposed/02-gates/liquidity-source-disagreement-kill.md`.

The new rule is that an EVM/Base token with Nansen liquidity above threshold still fails if a cheap executable route check shows only dust liquidity. HERMESOS and BLOCKTRONICS both looked alive in Nansen, but GoPlus/DeFi route data showed largest live UniV4 pools around `$2.4k` and `$5` respectively.
