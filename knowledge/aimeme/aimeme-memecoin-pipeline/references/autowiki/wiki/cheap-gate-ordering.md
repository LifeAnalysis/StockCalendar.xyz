# Cheap-Gate Ordering

Pipeline gates should run in ascending order of cost so free signals can reject a candidate before any paid call fires. Rugcheck, GeckoTerminal `/holders`, and DexScreener m5 buy/sell counters are zero-marginal-cost; Nansen smart-money endpoints are paid per call. When a candidate carries a fatal concentration or distribution flaw, that flaw is almost always visible in the free tier — so spending a Nansen call on it is pure waste. The discipline is: hard-gate on the cheapest signal that can kill, never the most informative one.

NYANDOG (Solana, pump.fun) is the canonical evidence. Step 5 hard gate read top10 = 94.48%, LP 0%, m5 sells 254 against only 31 unique sellers (bot-dump shape). All three numbers came from free endpoints, all three were independently fatal, and the rejection was decided before the Nansen smart-money call ran. Compare to FROGE in the same cycle, which correctly *did* spend the Nansen call because it cleared every cheap gate (top1=20.69%, top10=29.6%, h6 +115% monotonic) — Nansen was the only remaining unknown, and its 0-active-SM verdict was the actual disambiguator. The ordering pays off asymmetrically: free signals reject the obvious failures; paid signals are reserved for cases where they're the deciding evidence.

## Claims

- Implements [[../pipeline.md]] step 5 hard gates (`top10>30%`, `LP 0% AND age<14d`, m5 sell/seller bot-dump pattern) ahead of step 4b Nansen call.
- Supports [[../portfolio.md]] NYANDOG rejection: top10 94.48% + LP 0% + m5 254 sells / 31 sellers killed the candidate before any Nansen spend.
- Supports [[../portfolio.md]] FROGE flow: cheap gates passed, Nansen call justified, then `0 active SM` produced 1/4 reject — paid call earned its keep as the deciding signal.
- DerivedFrom [[aggregate-vs-instantaneous-meta-rule.md]] — m5 sells/sellers ratio is itself an aggregate-vs-instantaneous check that runs free.
- Extends [[top-holder-dumping.md]] and [[lp-locked-tristate.md]] — both are cheap-tier hard gates that must execute before any paid step.
- Contradicts a "score-everything-then-decide" pipeline shape that would call Nansen on every candidate regardless of free-tier verdict.

<!-- sources:
- ../pipeline.md
- ../portfolio.md
-->
