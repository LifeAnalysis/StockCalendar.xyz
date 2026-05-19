---
name: Memecoin Discovery Pipeline v3.9
description: Canonical agentcash + Nansen + Rugcheck pipeline for finding tradeable memecoins on ETH/Base/Solana/Arb. Includes hard kill gates, 4-point score, and SM-exit penalty.
type: project
originSessionId: f7be6edf-d975-477d-adff-f4eb867a46a1
---
# Memecoin Pipeline v3.8 (canonical)

## v3.8 changes (over v3.7)
1. **SM signal graduale** (non binario) — captures intensity, unblocks borderline
2. **LP locked tri-state** — unknown ≠ unlocked (fixes UniV4 false-negatives like uPEG)
3. **Cache TTL adattivo** — 5min/15min/30min by token age (memecoin move fast)
4. **ALMOST bucket persistente** — JSONL file, re-scored each cycle, promotes/drops
5. **Stage detection** — distinguish "accumulating uptrend" vs "post-peak bleed"
6. **Discovery: GT trending + Nansen /smart-money/dex-trades** (catches what SM is BUYING now)

## v3.9 changes (over v3.8) — META-RULE: aggregate vs instantaneous
The LEVR finding generalized: ANY aggregate metric (24h, 7d, lifetime) masks
current dynamics. Always compare aggregate vs instantaneous (m5/m15/m30) and
trust the recent direction when they diverge.

7. **Trending-but-dead filter (step 0.5)** — `if h24_pct >+200% AND h6 < h1 AND m30 sells > buys → REJECT`
   (catches SCAM/EMPLOYEE: pumped 24h ago, dying now)
8. **Top-holder dumping check (step 3.5)** — for each top10 holder:
   `balance_change_24h < -10% balance → flag TOP_HOLDER_DUMPING → hard kill or strong penalty`
   (catches devs distributing while UI looks "trending")
9. **Wash confirmation via m5 unique buyers (step 1.5)** —
   `if inflow_fdv_ratio > 20x AND m5_unique_buyers < 5 → confirmed wash REJECT`
   `if inflow_fdv_ratio > 20x AND m5_unique_buyers > 20 → real velocity, send to step 3`
   (avoids killing real Solana pumps misclassified as bot wash)
10. **Monotonic netflow score (step 5.5 fix)** —
    `pts=1.0 if netflow_6h>0 AND netflow_1h>0 AND netflow_15m>0`
    `pts=0.6 if 6h>0 AND 1h>0 BUT 15m<0 (cooling)`
    `pts=0.3 if 6h>0 BUT 1h<0 (early dump)`
    `pts=0.0 otherwise`
11. **LP/Contract top1 whitelist (step 4a)** —
    `if top1.is_contract AND label matches /Pool|Vault|LP|Liquidity|Treasury|Multisig/i`:
    exclude from concentration calc
12. **Recent vs convicted SM (step 4b refinement)** —
    `high_conviction_sm = active SM holding > 7 days`
    `recent_sm = active SM holding ≤ 2 days`
    `if recent_only AND no_convicted → -0.3 penalty (FOMO pattern)`
    `if high_conviction ≥ 3 → +0.3 bonus`

**Why:** Built and validated 2026-04-28. v3.7 inverts step 0: GeckoTerminal `/onchain/trending` PRIMARY (real-time hot pools across ALL chains in one $0.01 call), Nansen screener as optional secondary discovery (catches SM-accumulation tokens not yet trending). Earlier weighted score (v4 9-component) was rejected after validation showed it ranked EMPLOYEE (all SM exited = bearish) above uPEG (10+ active SM). Honest 4-point binary score + SM-exit penalty produces correct rankings.

**How to apply:** Run hourly per chain. Hard kills first, then 4-point score on survivors. Log all scored candidates for future weight regression after 30+ outcomes.

## Steps

```
0a  DISCOVER (PRIMARY) GeckoTerminal /onchain/trending duration=1h     $0.01
                      Returns 20 hottest pools across ALL chains
                      (covers SOL/ETH/BSC/Base/Arb in single call)
0b  DISCOVER (OPT)    Nansen /token-screener per chain                 $0.01
                      Catches SM-accumulation not yet trending.
                      Filters: mcap $50k-$20M, age ≤30d, liq ≥$20k, vol6h ≥$30k

1   FREE PRE-FILTER (no API)                                           $0
    REJECT if any:
      - symbol regex /^(SCAM|RUG|HONEY|TEST|FAKE|LUCA)/i
      - sell_volume / buy_volume > 100 OR < 0.01  (honeypot)
      - inflow_fdv_ratio > 20x  (Solana wash bots)
      - buy_vol/sell_vol in [0.95,1.05] AND vol > 10× mcap (wash)
      - pool_age_min < 30 AND reserve < $20k (dust)
      - decimals not in {6,8,9,18}
      - m30 sells > 3× buys (active dump)
      - netflow ≤ 0 on 6h timeframe

2   CACHE             30-min TTL on (chain, address)                   $0

3   SAFETY SCAN  (MAIN KILL GATE)
    EVM (eth/base/arb):  OnchainExpat /api/x402-crypto/token-safety   $0.10
    Solana:              Rugcheck.xyz /v1/tokens/{addr}/report/summary $0
    REJECT (hard kill) if any:
      - is_honeypot=true
      - risk_level=critical
      - AI flags: "supply chain attack", "trojan", "launchpad allowance",
                  "hidden_owner", "owner_can_change_balance"
      - buy_tax >5% OR sell_tax >5%
      - is_proxy=true AND impl not in known-launchpad allowlist
      - rugcheck score_normalised < 20
      - rugcheck lpLockedPct < 50% AND age <14d AND mcap >$300k

4   PARALLEL ENRICHMENT (single tool block)                            $0.05-0.11
    a. Nansen /tgm/holders ownership DESC top 25                        $0.05
    b. Nansen /tgm/holders label_type=smart_money                       $0.05
    c. StableCrypto /etherscan/contract/getcontractcreation chainid=N   $0.01
    Skip (a) if step 3 returned ≥10 holders with detail.
    Skip (b) if step 3 returned ≥3 "Smart Trader" labels in top 25.

5   HARD GATES (no API)                                                $0
    REJECT if:
      - top1 ownership > 25% (excluding LP/contract addresses)
      - ≥5 EOAs identical token_amount + zero outflow (bundle)
      - creator address in top 10 holders (dev sniped own pool)

5.5 SCORE (4-point graduated, embedded — v3.8)                          $0
    # SM signal — graduated, NOT binary (v3.8 fix)
    sm_pts = min(1.0, active_sm_count * min(combined_sm_usd / pool_reserve, 0.5) * 2)

    # LP locked — tri-state (v3.8 fix)
    if lp_locked_pct >= 80:        lp_pts = 1.0
    elif lp_locked_pct < 80 and age_d < 14 and mcap > 300_000:  lp_pts = 0.0
    elif lp_locked_pct unknown:    lp_pts = 0.5  # don't punish UniV4 etc
    else:                          lp_pts = 0.5

    # Netflow + creator (binary as before)
    netflow_pts = 1.0 if netflow_6h > 0 else 0.0
    creator_pts = 1.0 if creator_not_in_top10 else 0.0

    score = sm_pts + lp_pts + netflow_pts + creator_pts   # 0.0–4.0

5.6 SM-EXIT VERIFICATION (v3.8 mandatory rule)                          $0
    /smart-money/netflow returns trader_count = LIFETIME 30d count.
    NEVER trust this alone. ALWAYS verify with /tgm/holders SM call:

    active_sm = count(SM holders with token_amount > 0)
    exited_sm = count(SM holders with full_outflow AND token_amount == 0)

    DISTRIBUTION_PATTERN check (HARD penalty):
      if exited_sm > active_sm AND exited_sm >= 3:
        → HARD KILL or downgrade to ALMOST regardless of score
        → Reason: SM accumulated, then distributed = bearish exit

    Validated cases:
      - LEVR (sol, 16 trader_count): 4 active vs 21 exited → REJECT
      - EMPLOYEE (eth, 4 SM touched): 0 active vs 4 exited → REJECT
      - MAGA (sol, 18 trader_count): 2 active vs 16 exited → REJECT
      - uPEG (eth): 10+ active vs few exited → BUY
      - PEPTIDE (sol, 5 trader_count): 6 active vs 4 exited → consider

    PENALTY (overrides tier):
      if sm_addresses_with_zero_balance_after_full_outflow >= 3:
        tier = "ALMOST"  # SM was in and dumped = bearish

    Tier:
      4/4 → BUY
      3/4 → WATCH (annotate which signal missing)
      ≤2  → ALMOST bucket

    Edge case: if rugcheck returned no LP-lock data (Solana not pump.fun),
    treat lp_locked component as PRESENT (1) only if explicit lock detected,
    else mark UNKNOWN — count as 0 but tag for manual review.

6   ALMOST-MADE-IT bucket (re-check next cycle)                        $0
    Capture all 3/4 and any 2/4 with clean distribution + organic ratio.
    Tag NANSEN_SM_LAG if Nansen returned no holders (likely too new).
    Manual cross-check on bullx.io / dexscreener / Twitter recommended.

7   SIZE + STOP (human)                                                —
    Position ≤1% pool depth
    Trail 30% stop
    Hard exit: top SM exits / liq <$30k / creator wakes / mcap halves

CACHE WRITE                                                            $0
LOG: write {chain, address, score, components, verdict, ts} to disk
     for future regression (after 30+ surfaced tokens).
```

## REPORTING REQUIREMENT (added v3.7)

For EVERY candidate from step 0, output verbose pass/fail reasoning:

```
TOKEN_SYMBOL (chain, mcap, age)
├─ Step 1 pre-filter: PASS / FAIL because <specific filter that triggered>
├─ Step 3 safety: PASS (score=N) / FAIL because <flag name + raw value>
├─ Step 4 holders: top1=X%, bundle? Y/N
├─ Step 4 SM: N active ($X), N exited
├─ Step 5 hard gates: PASS / FAIL because <which gate>
├─ Step 5.5 score: N/4
│   ├─ SM≥3:   ✓/✗  (current: N active)
│   ├─ LP≥80%: ✓/✗  (current: X%)
│   ├─ netflow: ✓/✗  (current: $X)
│   └─ creator: ✓/✗  (in top10? Y/N)
├─ SM-exit penalty: triggered/none
└─ VERDICT: BUY / WATCH / ALMOST / REJECT  (with one-line summary why)
```

Always show ALL components even on REJECT — user wants to see why each lost,
not just the kill. This produces a full audit trail per cycle and lets the
user spot edge cases the gates over-reject.

## Cost
- Cached hit: $0
- Step 3 reject: $0.11 (screener + safety)
- Full pass with skips: $0.13–$0.17
- High-conviction add: funding-source recursion (top 5 buyers × 2-deep) $0.10

## Wired tools (verified working today)
- Nansen `/token-screener`, `/tgm/holders`, `/nansen-score/top-tokens` — paid via agentcash
- OnchainExpat `/api/x402-crypto/token-safety` — EVM only, $0.10, 504s sometimes (timeout 120s)
- Rugcheck.xyz `/v1/tokens/{addr}/report/summary` — Solana, free, no key
- StableCrypto Etherscan family — chainid required (1=eth, 8453=base, 42161=arb)
- GeckoTerminal trending/new-pools/pool — via StableCrypto, $0.01

## Known gaps
- No Solana SM coverage parity with Nansen ETH (lags 24-48h)
- BlockRun X search 503'd → fall back to Dexter `/twitter/analyze` ($0.05)
- Bubblemaps V2 needs API key (free tier at bubblemaps.io/dev)
- No agentcash MEV/sandwich % endpoint (Allium SQL is the path)

## Pre-cycle wiki read (MANDATORY)
Before fetching trending, read every file in `autowiki/wiki/`. Articles encode rules learned from prior cycles (rug templates, score-component lessons, gate-ordering, SM-conviction priors). Apply them as soft priors during scoring and as hard checks during rejection — e.g. if `livo-launchpad-backdoor.md` exists, kill any token matching that template before spending a safety scan. If wiki contradicts pipeline.md, surface the contradiction in the report; do not silently override.

## Post-cycle learning hook (MANDATORY)
After every pipeline run, before reporting back:
1. Identify lessons worth keeping. Triggers: novel rejection pattern, unexpected pass, infra failure, threshold that misfired, recurring rug template, score component that dominated/underperformed.
2. For each lesson, write a short article to `autowiki/wiki.proposed/<slug>.md` (concept, not per-token log). Format: title (`# Concept`), 2–3 paragraphs synthesizing the *rule*, citing tokens as evidence. Reference parent files via `[[../portfolio.md]]` style links.
3. If extending an existing wiki article instead, write the proposed updated full file to `wiki.proposed/<same-slug>.md` — `merge.sh` will diff vs `wiki/`.
4. Never write to `autowiki/wiki/` directly. User reviews via `autowiki/scripts/merge.sh` then `--apply`.
5. If no novel lesson, skip silently. Don't pad.

## Why 4-point score not 9-component v4
Validated 2026-04-28 against 5 known cases: DWH, ARMA, uPEG, ASSFACE, EMPLOYEE.
- 9-component scored EMPLOYEE 70/100 (BUY) when manual call was "all SM exited, NO BUY"
- 9-component ranked ASSFACE > uPEG when uPEG had 10+ SM vs ASSFACE 1
- Bell-curve mcap weighting overwhelmed real SM signal
- 4-point binary + SM-exit penalty produced correct rankings: uPEG BUY, ASSFACE WATCH, EMPLOYEE ALMOST
- Conclusion: weighted scores require backtest data to earn complexity. Without 30+ logged outcomes, defensible binary signals beat made-up weights.


---

# 🟡 v4.0 PROPOSED — pending user review (2026-04-28)

> **Status:** Not active. v3.9 remains canonical until user approves promotion. Source: `autowiki/wiki.proposed/02-gates/strict-prefilter-gauntlet.md`.

## Strict prefilter AND-gate (run before scoring)

Every gate must pass. Any fail = REJECT, log one line, no score.

| Gate | Threshold | Source |
|---|---|---|
| Chain | sol, eth, base, arb | pipeline scope |
| Market cap | $100k ≤ mcap ≤ $2M | Nansen 2026, pump.fun post-grad zone |
| Token age | 6h ≤ age ≤ 14d | post-snipe, pre-saturation |
| Liquidity | ≥ $50k | between Degen $15k & Nansen $100k |
| LP locked | ≥ 80% | v3.9 rule, web confirms |
| Top-10 holders | ≤ 30% | Axiom/QuickNode consensus |
| Single non-CEX/LP holder | ≤ 15% | tightened from v3.9 |
| Total holders | ≥ 500 | filters ghost tokens |
| **Active SM (Nansen)** | **≥ 3** | mandatory floor (was 0 in v3.9) |
| Vol/mcap 24h | 0.1x – 5x | Nansen healthy zone |
| Bundle % | < 15% | trader checklist consensus |

## Rationale vs v3.9

v3.9 lacked explicit numeric gates on mcap/liq/holders/SM-count. Tokens with 0 SM, $20k liq, or 100 holders reached the scoring stage and consumed Nansen budget. v4.0 hard-gates them out at discovery.

## Validation cases (this run)

- ~40 trending Solana pools scanned → 1 passes all gates (HENRY)
- Dunald (clean LP, 0 SM) correctly filtered at SM≥3 gate
- All pump.fun fresh-launch new-pools (LP=0%) correctly filtered at LP≥80% gate
- Expected pass rate ~2-3% — matches healthy memecoin filter

## Outstanding questions before promotion

1. Should `bundle %` be hard gate or soft penalty? (no Nansen endpoint for it currently)
2. SM ≥ 3 threshold — does this exclude legitimate ETH/Base tokens where Nansen SM coverage is sparser?
3. Mcap upper bound $2M — too low for ETH-tier conviction trades like uPEG ($10M)?
