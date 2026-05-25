# Migrated: Dashboard Numbers Audit — Lessons (2026-04-28)

Migrated from `wiki/dashboard-numbers-audit-lessons.md` on 2026-04-28 per R4 (output separation). Original was a dated post-mortem; durable lessons already live in `wiki/dexscreener-pair-selection.md` and `wiki/drained-pool-honeypot.md`. Preserved here so nothing is lost when the user runs merge.sh.

---

# Dashboard Numbers Audit — Lessons (2026-04-28)

**Context:** Cross-checked every visible number on the aimeme dashboard against `portfolio.md` and the live DexScreener API. Three classes of bug emerged. Recording them here so future dashboard work avoids the same traps.

## Bugs found and fixed

### 1. Stop-band parser regex choked on price digits

`inferStopPct` in `dashboard/lib/market.ts` used `stop[^-\d]*(-\d+)%`. For notes shaped `"Stop $0.000223 (-30%)"`, the negated character class `[^-\d]*` halted on the `0` of the price and never reached the `-30%`. The function silently fell through to tier-default stops (C-tier → -20%, D-tier → -15%), so HENRY and Dunald displayed wrong stop bands while uPEG was correct only by accident (A-tier had no regex branch and defaulted to -30, which happened to match its actual stop).

**Fix:** `stop[\s\S]*?\(\s*(-\d+)%\s*\)` — match anything (lazy) up to the parenthesized percentage. The parens are the durable signal in the portfolio.md notation, not the digits before them.

**Lesson:** When parsing free-form notes that contain prices, never use negated-digit classes. Either anchor on stable structural tokens (parens, brackets, keywords) or use lazy `[\s\S]*?` to skip irrelevant content.

### 2. DexScreener `tokens/v1` returns the wrong pair

For uPEG, `tokens/v1/ethereum/{addr}` returned a single V3 0.3% pair at $119k liquidity. The real pool is V4 1% at $633k. Dashboard reported uPEG liquidity at $115.9K — the visible "liquidity dropped" alarm was completely false. See `dexscreener-pair-selection.md` for the full discussion and the `latest/dex/tokens/{address}` replacement.

**Lesson:** "One result" endpoints from data aggregators silently choose for you. For any liquidity-sensitive surface, fetch the full list and pick max yourself.

### 3. Drained-pool tokens dominated the "missed opportunity" strip

NYANDOG (sol) had `<$1` liquidity but a +50,426% h24 chart and was rendered as a giant "missed +16,038%" badge. The price was fictional (the pool has no exit). Filtering non-position rows by `liquidityUsd >= $100` removed the noise without hiding live positions. See `drained-pool-honeypot.md`.

**Lesson:** A price without exit liquidity is not a price. Any "what-if" arithmetic on such a price is meaningless. Filter at the data layer, not at the chart layer.

## Numbers that were correct (audited)

- All P&L calculations: uPEG -16.5% (847.54 vs 1014.53), HENRY -4.5% (0.0003037 vs 0.000318), Dunald -1.6% (0.0002578 vs 0.000262), ROO closed -19.91% / -$14.93.
- All `since` and `peak` percentages computed against `data/price-history.json` `firstSeenPrice` / `peakPrice`.
- ROO close on stop hit per LOOKBACK rule (m15 -15%, m30 -16.8% intra-window dump → cycle 3 stop at $0.0000865).

## Layout fix (separate from numbers but found in same audit)

`html, body { overflow:hidden }` plus `.content-shell { height: calc(100vh - 3.5rem); overflow:hidden }` locks the entire app to viewport height. Internal scroll lives on `.panel-body { overflow:auto }`. The home page's `.overview-side` wrapped three stacked panels (Active / Watchlist / Recent rejected) but had `overflow:hidden` and no flex column, so panels two and three were clipped off-screen with no scrollbar.

**Fix:** `.overview-side { display:flex; flex-direction:column; gap:0.75rem; overflow-y:auto; }` and `.overview-side > .panel { flex-shrink:0 }`.

**Lesson:** When a layout uses fixed-viewport panels with internal scroll, every multi-child container needs an explicit scroll axis. `overflow:hidden` on a parent silently kills children's content; one `overflow-y:auto` per stack is the discipline.

## Operational takeaway

Numbers correctness on a paper-trading dashboard is load-bearing for every subsequent analysis (regression weights, tier calibration, "did the strategy work"). Any time the dashboard data layer changes — endpoint swap, parser change, new filter — re-run the audit:

1. Spot-check three visible P&L cells against `(price - entry)/entry` by hand.
2. Spot-check liquidity against the deepest pair on the relevant aggregator.
3. Verify stop bands against the parenthesized override in portfolio.md notes.
4. Confirm no row has liquidity below $100 unless it is an actively-held position.
