# Cycle 5 Verdict — Did We Do Right Or Wrong With The Memes?

User question filed per R4. Snapshot taken 2026-04-28 ~17:55 UTC, less than 24h after the v4.0 strict-pipeline first BUY signal.

## Bottom line

Process: mostly right. Outcome: too early to grade. Net edge: positive on kills, neutral on entries.

## Score card

| Decision | Action | Outcome | Verdict |
|---|---|---|---|
| uPEG A-tier $150 (cycle 3 entry) | BUY at score 3.0/4 | -14.9% open / -$22.40 | A-tier sizing too aggressive. Strong SM signal did not prevent drawdown. Should have been B-tier. |
| PUNK v2 B-tier $100 | BUY at score 3.5/4 | -0.5% flat / -$0.50 | Correct sizing. B-tier hedged event-risk. Flat is neutral. |
| HENRY C-tier $75 | EXPERIMENT at 2.0/4 | -6.6% / -$4.95, holders +79% | Mixed. Distribution growth bullish, price action bearish. Hypothesis test still running. |
| Dunald D-tier $50 | EXPERIMENT at 2.3/4 | +4.5% / +$2.25 | Lowest-conviction is only winner. "Clean LP-locked retail-only" hypothesis gets early support. |
| xchat | NO ENTRY (LP=0% kill) | FDV $0, liq $0, dead | Best decision today. Saved ~-100%. |
| BELKA | NO ENTRY (SM-exit kill) | FDV $1.76M -> $2.02M (+15%) | Missed alpha. SM netflow turning negative was profit-taking on retail momentum, not distribution. |
| ~40 pump.fun graduates | NO ENTRY (LP=0% kill) | Mostly decayed, none mooned | Rule working at scale. |

## Aggregate paper P&L

- Total deployed: $375 ($150 + $100 + $75 + $50)
- Open P&L: -$25.60 (-6.83%)
- Window: <1h to ~24h since entries — statistically meaningless
- Stops: all positions well above stop-loss thresholds

## Kill accuracy is net positive

xchat save (avoided ~-100%) >> BELKA miss (foregone +15%). Pipeline screens rugs effectively. Of ~40 LP=0% kills in cycles 4-5, none mooned. The simple `lpLockedPct >= 80% OR REJECT` rule paid for the entire pipeline this cycle.

## Statistical caveat

Inverted score-outcome correlation in current snapshot (score 3.5/4 PUNK = flat, score 2.3/4 Dunald = winning) is meaningless at n=4 over <24h. Need 30+ closed positions before any score-component weight is regression-validated.

## Single biggest mistake

uPEG sizing. Should have been B-tier ($100), not A-tier ($150). Strong SM count is not a guarantee of price direction in choppy macro. Cost the experiment $7.47 in foregone-loss-reduction.

## Single biggest win

Killing xchat at LP=0%. Token went to literal zero. The cheapest gate in the stack (rugcheck, free) caught the highest-magnitude rug.

## Lesson refinements queued for v4.1

1. SM-exit-as-hard-kill (v3.9 step 5.6) needs nuance. BELKA showed SM netflow turning negative is sometimes profit-taking on retail momentum, not rug distribution. Tighten kill condition to require BOTH `exited_sm > active_sm` AND `exited_sm >= 3`. Pure netflow direction → soft penalty, not hard kill.
2. A-tier sizing ($150) gate. Even with 10+ SM signal, A-tier should require additional confirmation: trailing 7d positive net SM netflow OR holder count growing >5%/day. Otherwise default to B-tier.

## Recommended next move

Wait. Don't add positions. Re-snapshot in 24h. PUNK migration window closes ~2026-05-01 — that is the next event-driven re-check trigger.

## Sources

- `[[../portfolio.md]]` — full position table with timelines
- `[[../pipeline.md]]` — v3.9 canonical + v4.0 proposed
- `[[2026-04-28-cycle-5-full-pipeline-run.md]]` — discovery run report
- Nansen tgm/token-information calls 2026-04-28 17:45 UTC for fresh prices on uPEG, PUNK, HENRY, Dunald, BELKA, xchat
