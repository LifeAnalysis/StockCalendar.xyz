---
date: 2026-05-17
cycle: 15
type: buy-workflow-run
spend_usd: 0.11
verdict: NO CLEAN BUY
---

# Cycle 15 — Buy Workflow Run (v3.9)

## Buy List

1. **HAUSDORFF** — TINY SPEC (D-tier risk-budget only)
   - Address: `ENRAEN9assGLHU2QQCo4cAv818mDrMkb6f6pG8hHpump` (Solana)
   - Size: D-tier spray, no add
   - Why: 3 SM holders, +100% 24h SM balance, 1d old, MC $885k. Tape ferocious — h1 +167%, h6 +157%, h24 +2371%, 181/159 m5 buys/sells, 1616/1507 h1 buys/sells. Real velocity, real demand.
   - Main risk: LP only 61% locked at MC $885k — fails hard v3.9 LP gate (lpLockedPct<80 with MC>$300K, age<14d). Classified TINY SPEC per workflow Step 5: "strong SM + strong tape, but LP unknown/unlocked".
   - Invalidates if: LP drops further, h1 turns negative, m5 sells > buys ×2.

2. **OPENHUMAN** — WATCH
   - Address: `0x38298138dd4389013962d8492feaa5879408dba3` (Base)
   - Why: 3 SM, +77% 24h SM balance, 3d old, MC $329k, liq $152k, h1 +4.65%, h6 +4.68%, h24 +43%.
   - Main risk: h1 buys 12 < sells 15. Tape borderline. No EVM safety scan run (cost gate).
   - Invalidates if: h1 buys cross sells AND GoPlus clean. Then re-rate as TINY SPEC.

## No-Buy Rejects

- **ROYALPOP** (`8TbnsLM...pump`): LP 56% at MC $963k, 7d — fails LP hard gate. Tape mixed (h24 -36%, h1 +1.7%). 11 SM is real but workflow rule wins.
- **PRATT** (`6bXmxW5...pump`): LP 0% — hard reject. Tape also down (h1 -13%, h6 -20%).
- **🌱 TBH** (`8A295DW...pump`): LP 0% — hard reject. h24 +148% wasted.
- **BABYTROLL** (`6qdzMx4...pump`): LP 67% at MC $1.26M — fails LP gate. Tape negative (h6 -16%, h24 -50%, m5 sells > buys).
- **CLAWD** (`21rwEDi...`): only 5 SM but +16% balance — weak conviction, MC $172k. Skipped to save spend.
- **TRK** (`9shb4Vu...`): 3 SM only +12.6% balance — weak. Skipped.
- **VERSA** (`0x2cc0d...eba3`, Base): tape negative (h1 -6.4%, h1 sells 21 > buys 9). Skip.
- **🌱 JUDE** (`J6kj37z...`): MC $191k, only 4 SM at $7k value. Cross-checked with prior ETH workflow run — Nansen flagged ETH JUDE smart money EXITING earlier same period. Pattern suspicious — skip.
- **VVVKERNEL** (`0xb66e7...`, Base): tiny SM count, no clear conviction — skipped.
- **PAGO** (`6CVd9hq...`): 4 SM, +31% balance, MC $309k — borderline but skipped vs HAUSDORFF momentum.
- **🌱 TOLYBOT** (`FjgXCL8...`): MC $114k below useful threshold; 1d old, only $6k SM val. WATCH-only ammo.

## Spend / Data

- AgentCash balance start: $0.98 (base)
- AgentCash balance end: ~$0.87 (base)
- Paid calls used:
  - Nansen `/smart-money/holdings` ($0.05) — 13 candidates returned
  - Emblem-Nansen `/smart_money_trades` ($0.06) — prior ETH context for JUDE cross-check
- Free calls: Rugcheck ×5 (Solana), DexScreener ×7 (all candidates)
- Skipped: GoPlus on Base (tape already killed VERSA; OPENHUMAN deferred to WATCH)
- Skipped: Nansen `/tgm/holders` (no candidate cleared safety to deserve $0.05)
- Report path: `autowiki/outputs/2026-05-17-cycle-15-buy-workflow-run.md`

## Operator Note

Cycle outcome dominated by v3.9 LP hard gate. Solana low-caps with 50-67% LP at MC >$300K all kill, even with strong SM signal. HAUSDORFF is the only candidate where tape × SM × age combination is striking enough to risk D-tier with the LP-unlocked penalty. If anything pumps from this set without you, expect HAUSDORFF.

Nothing else clean.
