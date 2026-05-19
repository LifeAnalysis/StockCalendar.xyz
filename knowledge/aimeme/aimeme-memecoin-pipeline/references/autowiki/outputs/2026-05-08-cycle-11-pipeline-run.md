# 2026-05-08 Cycle 11 Pipeline Run

Source: GeckoTerminal on-chain trending, duration `1h`, fetched through StableCrypto/AgentCash.

Budget: started `$0.2921`, ended `$0.2421`. Paid calls used: GeckoTerminal trending and three EVM token-security lookups via the cheaper GoPlus-compatible route. Free Rugcheck was used for Solana candidates. The `$0.10` OnchainExpat safety scan was not spent because all new candidates died at cheaper gates.

## Summary

No BUY candidates.

Verdicts:

| Token | Chain | Verdict | Main reason |
|---|---:|---:|---|
| HANTA | solana | REJECT | Rugcheck score 1/100 and LP locked 35.6% |
| Viruscoin | solana | REJECT | Rugcheck score 16/100, below hard-kill threshold |
| MAGA | solana | REJECT | Rugcheck score 1/100 and LP locked 62.9% |
| sat1 | ethereum | REJECT | `owner_change_balance=true`, `is_mintable=true`, recent dump |
| sato | ethereum | REJECT | `owner_change_balance=true` |
| uPEG | ethereum | HOLD / EXISTING | Existing portfolio name; cheap safety route remains clean |
| B3 | base | SKIP | FDV/market cap outside memecoin discovery range |
| WETH/USDC | base | SKIP | Major asset pair, not a candidate |
| SOL/USDC | solana | SKIP | Major asset pair, not a candidate |
| BSC / TON rows | bsc/ton | SKIP | Out of configured chain scope |

## Candidate Detail

### HANTA (solana, FDV $8.46M, age 4d 15h)

- Step 1 pre-filter: FAIL. Aggregate-vs-instantaneous conflict: h24 +456.9%, h6 -40.3%, h1 -3.6%; m5 sells 129 > buys 72. Not a clean monotonic entry.
- Step 3 safety: FAIL. Rugcheck `score_normalised=1`, `lpLockedPct=35.62%`.
- Step 4 holders: not spent; killed by free safety gate.
- Step 4 SM: not spent; killed by free safety gate.
- Step 5 hard gates: FAIL via safety/LP profile.
- Step 5.5 score: 0/4 scored only directionally; SM unknown, LP 0, netflow/direction weak, creator unknown.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Low Rugcheck score plus sub-50% LP lock is fatal.

### Viruscoin (solana, FDV $31.5K, age 33m)

- Step 1 pre-filter: FAIL. Liquidity $14.4K below the $20K reserve floor for a fresh pool; h1 -61.9%, m30 -33.6%.
- Step 3 safety: FAIL. Rugcheck `score_normalised=16`; risk: low amount of LP providers.
- Step 4 holders: not spent; killed by free safety gate.
- Step 4 SM: not spent; killed by free safety gate.
- Step 5 hard gates: FAIL via safety score under 20.
- Step 5.5 score: 1/4 maximum from LP lock only; SM unknown, netflow/direction failing, creator unknown.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Below Rugcheck threshold and too early/illiquid.

### MAGA (solana, FDV $14.87M, age 77d)

- Step 1 pre-filter: FAIL. h6 is positive but recent tape is sell-heavy: m5 sells 52 vs buys 29, h1 sells 1280 vs buys 732.
- Step 3 safety: FAIL. Rugcheck `score_normalised=1`, `lpLockedPct=62.86%`.
- Step 4 holders: not spent; killed by free safety gate.
- Step 4 SM: not spent; killed by free safety gate.
- Step 5 hard gates: FAIL via safety score.
- Step 5.5 score: 0/4 scored directionally; SM unknown, LP below 80, recent netflow/direction weak, creator unknown.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Free Rugcheck hard-kill.

### sat1 (ethereum, FDV reported $0, age 1h 18m)

- Step 1 pre-filter: FAIL. h6/h24 +228.8% masks recent collapse: h1 -50.0%, m30 -43.6%, m15 -30.7%.
- Step 3 safety: FAIL via cheaper GoPlus-compatible route. `owner_change_balance=true`, `is_mintable=true`; buy/sell tax 0, honeypot false, proxy false.
- Step 4 holders: top1 EOA 5.21%; top holder concentration did not kill it by itself.
- Step 4 SM: not spent; owner-change/mint flags already killed it.
- Step 5 hard gates: FAIL. Owner can change balances is treated as the `owner_can_change_balance` hard-kill class.
- Step 5.5 score: 1/4 maximum from concentration only; LP unknown/UniV4, SM unknown, netflow/direction failing, creator not top10.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Mutable balances plus mintability on a fresh UniV4 meme are fatal.

### sato (ethereum)

- Step 1 pre-filter: partial data from truncated discovery; candidate appeared in the ETH trending response.
- Step 3 safety: FAIL via cheaper GoPlus-compatible route. `owner_change_balance=true`; buy/sell tax 0, honeypot false, proxy false, mintable false.
- Step 4 holders: top1 EOA 2.76%; top holder concentration did not kill it by itself.
- Step 4 SM: not spent; owner-change flag already killed it.
- Step 5 hard gates: FAIL. Owner can change balances is a hard-kill class.
- Step 5.5 score: not advanced.
- SM-exit penalty: not checked.
- VERDICT: REJECT. Mutable holder balances override clean tax/proxy fields.

### uPEG (ethereum, existing portfolio name)

- Step 1 pre-filter: PASS/monitor. h6 +16.5%, h1 +5.2%, h24 -27.6%; m15/m30 are mildly negative, so this is not a new-entry breakout.
- Step 3 safety: PASS on cheap route. Honeypot false, mintable false, proxy false, owner renounced/zero, taxes 0.
- Step 4 holders: top1 is Uniswap V4 pool manager at 8.51%, excluded as pool/contract; top EOA holder 1.36%.
- Step 4 SM: not re-spent in this cycle.
- Step 5 hard gates: PASS on cheap concentration and creator checks.
- Step 5.5 score: not re-entered as a new candidate; existing thesis remains separate in `portfolio.md`.
- SM-exit penalty: not checked in this cycle.
- VERDICT: HOLD / EXISTING. No new buy signal, but no cheap-route structural break.

## Skips

- B3 on Base: market cap about $75.8M and FDV about $163.1M, outside the $50K-$20M memecoin screener envelope.
- WETH/USDC on Base and SOL/USDC on Solana: major asset liquidity pairs, not memecoin candidates.
- MBGA and other BSC rows: BSC is outside the configured ETH/Base/Solana/Arb scope.
- Acton on TON: TON is outside configured scope.

## Learning Hook

No new wiki proposal written. The run reinforced existing rules:

- `aggregate-vs-instantaneous-meta-rule.md`: HANTA and sat1 both looked better on h24/h6 than on the live windows.
- `cheap-gate-ordering.md`: Rugcheck and the cheaper EVM security route killed every live candidate before Nansen or OnchainExpat spending was justified.
- `lp-locked-tristate.md`: uPEG still needs UniV4-aware LP interpretation; sat1 did not earn that benefit because owner-change and mintability killed first.
