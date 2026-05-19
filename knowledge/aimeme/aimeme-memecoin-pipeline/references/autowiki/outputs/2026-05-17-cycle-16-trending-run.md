---
date: 2026-05-17
cycle: 16
type: trending-skill-run
spend_usd: 0.21
verdict: WATCH (HAUSDORFF)
---

# Cycle 16 — /trending skill run (first execution)

## Discovery

Reused cycle 15 Nansen `/smart-money/holdings` candidates (13 tokens, ~10min old, valid).
Skipped GeckoTerminal trending (Step 2a) and Emblem-Nansen Solana fallback (Step 2c) for this dry-run — discovery cost spared.

## Per-candidate audit (top 5 by SM value)

```
HAUSDORFF (solana, $885k, 1d)
├─ Discovery: nansen-holdings #5
├─ Pre-filter: PASS
├─ Safety: PASS (rugcheck score 1, no risks, lpLockedPct=61%, age 1d, mcap $885k)
│         → triggers v3.9 lp_pts=0.5 (partial, NOT hard kill — canonical 50% threshold)
├─ Tape: liq=$81,510, h1=+167%, h6=+157%, h24=+2371%, m5 buys/sells=181/159, h1=1616/1507
├─ SM check: 5 active ($16,481), 0 exited, 0 high-conviction(>7d holding), 5 recent
│         [⚠ Token only 1d old → high_conviction-by-holding-age is structurally impossible.
│          1 of 5 holds 180D Smart Trader LABEL — skill ignores this. Flagged.]
├─ Social: skipped (Dexter /twitter/analyze endpoint does NOT exist on agentcash)
├─ Score: sm=1.0 lp=0.5 netflow=1.0 creator=1.0 = 3.5/4 (recency adj -0.3 by strict rule) = 3.2/4
├─ SM-exit kill: NOT triggered (0 exited vs 5 active)
└─ VERDICT: WATCH — LP partial-lock is the only missing component. Trigger: LP ≥80%.

ROYALPOP (solana, $963k, 7d)
├─ Discovery: nansen-holdings #1
├─ Pre-filter: PASS
├─ Safety: PASS (rugcheck score 1, lpLockedPct=56%, age 7d, mcap $963k)
│         → lp_pts=0.5 (partial)
├─ Tape: liq=$105k, h1=+1.7%, h6=+7.9%, h24=-35.9%, m5 6/6
├─ SM check: 11 active ($40,879 holdings) — Step 6 NOT run (saved $0.05)
├─ Social: skipped (endpoint missing + h24 negative anyway)
├─ Score: indicative ~3.5/4 pending Step 6 verification
└─ VERDICT: WATCH — h24 deeply negative despite SM accumulation. Trigger: h24 turns positive + Step 6 SM-exit verified.

PRATT (solana, $410k, 11d)
├─ Safety: HARD KILL (lpLockedPct=0)
└─ VERDICT: REJECT

TBH (solana, $592k, 2d)
├─ Safety: HARD KILL (lpLockedPct=0)
└─ VERDICT: REJECT

BABYTROLL (solana, $1.26M, 7d)
├─ Safety: PASS (lpLockedPct=67%) → lp_pts=0.5
├─ Tape: h1=-4.5%, h6=-16.7%, h24=-50%, m5 buys 10 < sells 14 (active dump)
└─ VERDICT: REJECT (tape, monotonic netflow ladder = 0.0)
```

## Buy List

(none CLEAN)

### WATCH

- **HAUSDORFF** (Sol `ENRAEN9...pump`) — score 3.2-3.5/4. Monster tape, 5 active SM (1 with 180D label), LP only 61% locked. Trigger: LP locks ≥80%. Risk: 1d-old fresh launch could dump as fast as it pumped. D-tier spray buy is defensible if you want to ride momentum despite the LP risk.

## Rejects (compact)

- PRATT: LP=0
- TBH: LP=0
- BABYTROLL: tape down, monotonic netflow 0/4
- VERSA, ROYALPOP partially scored — Step 6 not run to save spend

## Spend / Data

- AgentCash start: $0.93 (base)
- AgentCash end: $0.78 (base)
- Paid calls:
  - Cycle 15 carry-over: Nansen /smart-money/holdings $0.05, Emblem-Nansen /smart_money_trades $0.06
  - This cycle: Nansen /tgm/holders (HAUSDORFF) $0.05, Nansen /tgm/holders schema-check (free probe)
- Free: rugcheck ×5, dexscreener ×7
- Skipped: GeckoTerminal trending, Emblem-Nansen Solana, Dexter twitter (endpoint missing), GoPlus base
- Report path: `autowiki/outputs/2026-05-17-cycle-16-trending-run.md`

---

## Skill improvements proposed

After first end-to-end run, here's what to fix:

### 1. **Dexter `/twitter/analyze` doesn't exist on agentcash** (high priority)
Skill Step 6.5 references a fictional endpoint copied from pipeline.md "known gaps" — that section was a TODO, not a working tool. Real options:
- **Dexfra `/v1/public/social/x/metadata`** $0.01 (Solana only, returns X handle + metadata, not sentiment)
- **XActions `/api/ai/engagement/crypto-analyze`** $0.03 (takes Twitter handle, not token address — needs 2-call pipeline: Dexfra metadata → XActions analyze)
- Or: scrape DexScreener's `info.socials[]` for X URL (free), then XActions analyze ($0.03)

Update Step 6.5 to: chain Dexfra ($0.01) → XActions ($0.03) = $0.04/finalist. Or skip social entirely until BlockRun /x-search comes back.

### 2. **Conviction-by-holding-age is broken for tokens <7d old** (high priority)
Skill defines `high_conviction_sm = SM holding >7 days`. For a 1d-old token like HAUSDORFF that's structurally always 0, forcing a `-0.3` FOMO penalty even when a 180D-labeled trader is in the bag. Fix: treat Nansen LABEL-tier as conviction proxy when token age < label-window-min:

```
if token_age_days < 7:
    high_conviction_sm = count(active SM with label in {"180D Smart Trader", "90D Smart Trader", "Fund"})
else:
    high_conviction_sm = count(active SM with holding_days > 7)
```

### 3. **Step 6 (SM-exit kill) needs cheaper screen first** (medium)
Right now skill spends $0.05/finalist on `/tgm/holders` even when SM count from holdings call already shows the token has <3 SM holders (can't be CLEAN BUY anyway). Add gate: skip Step 6 if `holders_count from Step 2b < 3` AND not high-momentum (h24 < +100%). Cuts wasted spend ~30%.

### 4. **GeckoTerminal trending endpoint not actually wired** (medium)
Step 2a references "GeckoTerminal /onchain/trending via StableCrypto family" but I never confirmed it works via agentcash. Need to add a discovery probe + fallback to free GeckoTerminal public API if paid route fails.

### 5. **Cycle-log.jsonl format not yet enforced** (medium)
Step 10 mandates JSONL append, but skill didn't generate one this run (because I reused cycle 15 candidates). Add a guard: every cycle MUST emit JSONL even on partial discovery. Without this, the 30-outcome backtest threshold never arrives.

### 6. **Budget gate too coarse** (low)
Step 1 thresholds at $0.20 / $0.15 / $0.05 are arbitrary. Should be computed from per-cycle expected cost: discovery ($0.06) + safety ($0.03 max EVM) + finalists ($0.05 × max 3) + optional social ($0.04 × max 2) = ~$0.27/full cycle. Set threshold dynamically based on what user wants to run.

### 7. **No portfolio dedupe** (low)
Step 0 reads `portfolio.md` but Step 9 doesn't filter out tokens already held. Add: drop candidates whose address matches any open position in portfolio. (No collisions this cycle — uPEG not in candidate set.)

### 8. **Pre-filter Step 3 needs raw data we don't always have** (low)
Rules reference `inflow_fdv_ratio`, `m5_unique_buyers`, `sell_vol/buy_vol`. DexScreener gives buy/sell counts but not unique buyers. Either drop the unique-buyer gate or wire a paid source (BirdEye/SniperX).

### 9. **HAUSDORFF case study: skill judged correctly but for wrong reason** (insight)
Skill recommends WATCH on LP-partial logic. But the real trader's question is: is +2371% h24 wash or real? m5 buys/sells = 181/159 (real demand, per wash-vs-real-velocity rule >20 unique buyers ≈ real). m5 ratio close to 1.0 though — could be cycling. Want a cheap wash-detector that combines (m5_unique_buyers, buy_size_distribution, gini-coef-of-trades) before TINY SPEC sizing.

### 10. **Spend summary already works** ✓
Step 9 output block correctly itemizes spend. Good.
