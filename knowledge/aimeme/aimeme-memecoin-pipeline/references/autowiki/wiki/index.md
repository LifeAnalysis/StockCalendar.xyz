# Wiki Index

Content catalog the LLM reads first when answering queries against the autowiki. Each entry below points to a canonical page covering one load-bearing rule, pattern, or operational discipline of the v3.9/v4.0 pipeline.

Last updated: 2026-04-28

## Pipeline scoring

- [[sm-conviction-is-non-negotiable]] — Active smart-money is a full point of the 4-point score, not a tiebreaker; FROGE shows a clean 5-month token still rejects at 1/4 with zero SM.
- [[monotonic-netflow-score]] — Graduated 4-step ladder (1.0/0.6/0.3/0.0) rewarding monotonic netflow positivity across 6h/1h/15m windows instead of a binary 6h check.
- [[position-sizing-tiers]] — Tier-based v4.0 sizing (S/A/B/C/D + WATCH + HARD KILL): score becomes size, borderline candidates get a half-bet rather than a zero-bet.
- [[lp-locked-tristate]] — Tri-state LP-lock signal (`locked / unknown / unlocked`) so UniV4 structural absence of lock data scores 0.5 instead of 0.

## Pattern detection

- [[sm-exit-pattern]] — Step 5.6 hard-kill when `exited_sm > active_sm AND exited_sm >= 3`; defuses Nansen lifetime `trader_count` flattering distributing tokens.
- [[top-holder-dumping]] — Step 3.5 flags any top-10 wallet whose 24h balance dropped more than 10% of its position; catches devs distributing into a still-trending UI.
- [[wash-vs-real-velocity]] — Step 1.5 disambiguates `inflow_fdv_ratio > 20x` using m5 unique buyers (<5 wash, >20 real demand) instead of killing on dollar volume alone.
- [[aggregate-vs-instantaneous-meta-rule]] — v3.9's organizing principle: every aggregate metric is cross-checked against an instantaneous window and the recent direction wins on divergence.

## Operational rules

- [[cheap-gate-ordering]] — Run pipeline gates in ascending cost order so free signals (Rugcheck, holders, m5) reject before paid Nansen calls fire; NYANDOG vs FROGE is the canonical contrast.
- [[sm-conviction-recency]] — Step 4b splits active SM by holding age: `-0.3` if only recent (<2d) SM, `+0.3` if three or more convicted (>7d) holders.

## Token-series intel

- [[livo-launchpad-backdoor]] — ETH Livo launchpad template grants a permanent unlimited allowance over every holder; ARMA and NICE are confirmed instances and are hard-killed at step 3.
- [[v4-experimental-entries-2026-04-28]] — HENRY and Dunald Tromp opened below v3.9 BUY threshold as v4.0 strict-prefilter experiments; tests SM-contrarian-netflow vs clean-LP-no-SM hypotheses.

## Pattern detection — exit-side

- [[drained-pool-honeypot]] — `liquidity < $100` with 4–5 digit % charts; fictional price, exit-impossible. NYANDOG (94.48% top10) and PEPTIDE ($0 liq) are canonical instances.

## Tooling

- [[dexscreener-pair-selection]] — Use `latest/dex/tokens/{address}` and pick max-liq, not `tokens/v1/{chain}/{addrs}` which returns a single non-deepest pair (uPEG V3 $119k vs V4 $633k).
- [[dashboard-numbers-audit-lessons]] — Three bug classes found 2026-04-28 (regex on price digits, wrong DexScreener endpoint, drained pools polluting "missed" strip) and the audit checklist that catches them.

## Related first-class sources

- [[../pipeline.md]]
- [[../portfolio.md]]
- [[../onepager.md]]

## Pending in wiki.proposed/

- [[../wiki.proposed/v4.0-strict-prefilters.md]]
- [[../wiki.proposed/watchlist-price-tracking.md]]
- [[../wiki.proposed/02-gates/creator-in-top10-evm-kill.md]] — cycle-7 UNICURVE evidence: GoPlus creator_address ∈ top-10 holders = step-5 hard kill
