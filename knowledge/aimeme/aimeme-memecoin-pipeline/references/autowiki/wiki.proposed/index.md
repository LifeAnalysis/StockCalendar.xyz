# Wiki Index (proposed restructure 2026-04-28)

This index renders dynamically via Dataview if you have the plugin installed in Obsidian. Otherwise it serves as a manual catalog. Filenames remain kebab-case slugs so existing `[[wikilinks]]` resolve unchanged across the new subfolder layout.

## Scoring (10-19)

- [[monotonic-netflow-score]] (10) — Score Netflow Monotonicity. v3.9 graduated 6h/1h/15m ladder replacing v3.8 binary.
- [[position-sizing-tiers]] (11) — Size By Tier Conviction. v4.0 S/A/B/C/D allocation table; borderline = half-bet not zero-bet.
- [[sm-conviction-floor]] (12) — Smart Money Conviction Floor. Active SM is a full score component, not a tiebreaker (FROGE).
- [[sm-conviction-recency]] (13) — Distinguish Recent Vs Convicted SM. ±0.3 deltas for >7d holders vs <2d FOMO entrants.

## Gates (20-29)

- [[cheap-gate-ordering]] (20) — Order Free Gates Before Paid. Free signals reject obvious fails before any Nansen call.
- [[drained-pool-honeypot]] (21) — Detect Drained-Pool Honeypot. Liquidity <$100 with violent up-chart = no exit (NYANDOG, PEPTIDE).
- [[lp-locked-tristate]] (22) — Gate LP Lock With Tri-State. locked / unknown / unlocked; 0.5 default kept uPEG eligible.
- [[top-holder-dumping]] (23) — Detect Top-Holder Distribution. Top10 24h balance change <-10% → flag dumping.
- [[strict-prefilter-gauntlet]] (24) — Apply Strict Prefilters (v4.0). Hard AND-gate before scoring; mandatory SM ≥3 is rate-limiting.
- [[goplus-evm-safety-fallback]] (25) — Use GoPlus When OnchainExpat Down. Free public EVM safety check; verified against CAS top1=85% (cycle 6).
- [[wash-via-symmetric-buy-sell]] (26) — Detect Wash Via Symmetric Trades. m5/m15/m30 buys==sells + low unique buyers = wash bot (HRP cycle 6).
- [[bsc-out-of-scope-tagging]] (27) — Auto-Skip BSC Pools. Pipeline scope is sol/eth/base/arb; skip BSC at step 0 to clean audit.
- [[creator-in-top10-evm-kill]] (28) — Hard-Kill EVM Creator In Top-10 Holders. GoPlus creator_address ∈ top-10 → step-5 kill regardless of % (UNICURVE cycle 7, 4.87% rank #2).
- [[goplus-honeypot-with-same-creator-kill]] (29) — Step-3 Hard Kill On GoPlus Recidivism Flag. `honeypot_with_same_creator=1` = creator deployed prior honeypot; PRISMA/NOCOBASE cycle 9.
- [[creator-in-top10-solana-rugcheck]] (46) — Apply Solana creator-in-top10 hard kill through Rugcheck `topHolders[].owner`.

## Patterns (30-39)

- [[livo-launchpad-backdoor]] (30) — Recognize Livo Launchpad Backdoor. Permanent unlimited allowance over holders (ARMA, NICE).
- [[pump-fun-lp-zero-default]] (31) — Recognize Pump.Fun LP-Zero Default. Post-graduation tokens read LP 0% by default; tristate fix.
- [[sm-exit-pattern]] (32) — Identify Smart-Money Exit. exited_sm > active_sm AND ≥3 → hard kill (LEVR, EMPLOYEE, MAGA).
- [[token2022-emoji-series-pattern]] (33) — Recognize Token2022 Emoji-Series. Coordinated launcher fingerprint → treat as one bet.
- [[vc-backed-dormant-revival-pattern]] (34) — Detect VC-Revival Pattern. Dormant pre-2024 contract + recent LP + named-VC clustering (PUNK v2).
- [[wash-vs-real-velocity]] (35) — Distinguish Wash From Real Velocity. m5 unique buyers as confirmation gate vs inflow_fdv_ratio aggregate.
- [[typosquat-oss-token-name-pattern]] (36) — Recognize Typosquat OSS Rug Template. token_name = `{REAL_OSS} github.com/{org}/{NAME}` + same-creator honeypot history; SM-holdings can surface these falsely.

## Meta (40-49)

- [[aggregate-vs-instantaneous-meta-rule]] (40) — Trust Instantaneous Over Aggregate. v3.9 organizing principle; six concrete instantiations.
- [[dexscreener-pair-selection]] (41) — Select Correct DexScreener Pair. Use latest/dex/tokens, max-liq filter; never tokens/v1.
- [[nansen-mcap-liquidity-thresholds]] (42) — Apply Nansen Liquidity Thresholds. External 2026 benchmark — $100k liq, top10 ≤40%, vol/mcap 10-30%.
- [[terminal-filter-consensus]] (43) — Apply Terminal Filter Consensus. Photon/BullX/GMGN/Axiom revealed-preference numbers.
- [[watchlist-price-tracking]] (44) — Track Watchlist Prices Post-Hoc. Persistent DexScreener time-series for every spotted token.
- [[spray-sizing-discipline]] (45) — Keep discretionary spray/pray entries capped, labeled, and separate from strict pipeline BUY signals.

## Pending Tombstones

- [[dashboard-numbers-audit-lessons]] — R4 violation; durable lessons live in [[dexscreener-pair-selection]] and [[drained-pool-honeypot]]. Migrated to outputs/.
- [[v4-experimental-entries-2026-04-28]] — R4 violation; per-token narrative belongs in outputs/. Durable lessons live in [[strict-prefilter-gauntlet]] and [[vc-backed-dormant-revival-pattern]].

## Dataview snippet (paste into Obsidian)

```dataview
TABLE id, function AS "Function", category, status
FROM "wiki" OR "wiki.proposed"
WHERE id
SORT id ASC
```

For per-category views:

```dataview
TABLE id, function AS "Function", status
FROM "wiki.proposed"
WHERE category = "scoring"
SORT id ASC
```
