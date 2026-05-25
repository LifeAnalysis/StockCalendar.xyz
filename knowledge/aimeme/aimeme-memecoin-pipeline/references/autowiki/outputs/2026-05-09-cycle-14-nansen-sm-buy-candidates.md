# 2026-05-09 Cycle 14 — Nansen SM Buy-Candidate Check

Source: AgentCash/Nansen holdings run at `2026-05-09 08:56 UTC`.

Budget: started `$0.0621`, ended `$0.0021`. Paid calls used: Nansen `/smart-money/holdings` (`$0.05`) and cheap GoPlus/DeFi safety for UORE (`$0.01`). Free Rugcheck/DexScreener were used for Solana and market/tape checks.

## Summary

No clean pipeline BUY.

Best aggressive candidate: **UORE** on Ethereum. It is the only new candidate that improved the opportunity set versus cycle 13, but it carries an LP-control risk.

| Rank | Token | Chain | Verdict | Why |
|---:|---|---:|---|---|
| 1 | UORE | ethereum | AGGRESSIVE WATCH / tiny-spec only | Strong Nansen SM value, clean contract flags, strong tape, real liquidity; but creator controls most LP NFT value and LP is not locked |
| 2 | PRX | solana | WATCH / ALMOST | 3 active SM including 2 180D labels, LP locked; but weak h1/h6 tape and high concentration |
| 3 | LIMINAL | solana | REJECT / monitor only | SM balance growth, but sell-heavy h1/h6/h24 tape |
| 4 | PRATT | solana | REJECT | Rugcheck score 16 and LP now reported 0% in summary |
| 5 | OGNOME | solana | REJECT | LP locked 0% |

## Candidate Detail

### UORE (ethereum, `0x1f6102a413d72a6d37479405adf14e8d7910032a`)

- Nansen holdings: PASS. 4 SM holders, `$25.9K` SM value, `+100%` 24h SM balance change, mcap about `$940.9K`, age 1d.
- DexScreener tape: PASS but hot. Deepest pair: about `$149.5K` liquidity, FDV about `$1.09M`, h1 `+38.9%`, h6 `+95.1%`, h24 `+47,238%`; h1 buys/sells `250/302`, h6 `908/931`, h24 `4498/3273`.
- GoPlus/DeFi safety: PASS on contract flags. Honeypot false, mintable false, proxy false, taxes 0, owner zero, `honeypot_with_same_creator=0`, holder count 806.
- Structure caveat: FAIL/strong penalty. Token contract holds about `50.26%` of supply. Creator holds about `1.7%` of token supply, but the LP holder table shows creator address controls about `$54.3K` of LP NFT value, `95.75%` of LP total, and `is_locked=0`.
- Verdict: **AGGRESSIVE WATCH / tiny-spec only**, not a clean pipeline BUY. If buying anyway, this is D-tier sizing discipline, not A/B-tier conviction.

### PRX (solana)

- Refreshed DexScreener: deepest pair about `$60.8K` liquidity, FDV about `$413K`, h24 `+14.5%`.
- Tape remains weak short-term: h1 `-4.1%`, h6 `-4.2%`, h1 buys/sells `16/16`, h6 `32/35`.
- Existing TGM from cycle 13: 3 active SM, 2 are 180D Smart Trader labels.
- Verdict: **WATCH / ALMOST**. Better structure than most Solana names, but not buyable until tape turns.

### PRATT

- Nansen holdings: 4 SM holders, `$31.0K` SM value, +60.5% 24h SM balance change.
- Rugcheck summary: `score_normalised=16`, low LP-provider warning, `lpLockedPct=0`.
- Verdict: REJECT.

### OGNOME

- Nansen holdings: 3 SM holders, `$7.3K` SM value.
- Prior Rugcheck: LP locked 0%.
- Verdict: REJECT.

### LIMINAL

- Nansen holdings: 4 SM holders, `$5.8K` SM value, +243.9% 24h SM balance growth.
- Prior DexScreener tape: h1 buys/sells `111/332`, h6 `1155/1571`, h24 `6257/11620`; price h6/h24 negative.
- Verdict: REJECT / monitor only.

## Buy List

If forced to pick from this run:

1. **UORE** — only as a tiny speculative D-tier entry because the tape and SM signal are strongest. The LP-control risk blocks a clean BUY.
2. **PRX** — do not buy now; set alert for h1/h6 flip positive with buys > sells.

Everything else is a no-buy.
