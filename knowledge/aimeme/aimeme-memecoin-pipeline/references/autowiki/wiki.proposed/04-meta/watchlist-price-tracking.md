---
id: 44
category: meta
function: Track Watchlist Prices Post-Hoc
status: proposed
related: [41, 32, 10, 20]
name: Watchlist Price Tracking
description: Persistent DexScreener time-series for every token spotted by the pipeline (active, watchlist, rejected). Lets us grade call quality post-hoc by measuring price appreciation since the moment we first saw a token.
type: project
---

# Watchlist Price Tracking

**Why:** Without an external price log, we can't tell good calls from lucky ones. A "pass" on a token that 10x'd is just as instructive as a "buy" that drew down. Memecoins die fast, so first-seen → now is the canonical performance window — not entry → exit.

**How to apply:** Every token whose address ends up in `portfolio.md` (active position, watchlist row, or rejected lesson) gets polled by `dashboard/scripts/poll-prices.mjs`. Each run appends a snapshot to `data/price-history.json` keyed by `chainId:address`. The first snapshot with a non-null price becomes the **spot price** — that anchor never changes. UI surfaces `% since spot` and `peak % since spot` so we can review whether the pipeline's verdict was correct.

## Storage

`data/price-history.json` (repo root, parallel to `portfolio.md`):

```json
{
  "version": 1,
  "updatedAt": "ISO-8601",
  "tokens": {
    "ethereum:0x44b...": {
      "symbol": "uPEG",
      "chain": "eth",
      "chainId": "ethereum",
      "address": "0x44b...",
      "source": "active",
      "firstSeenTs": "...",
      "firstSeenPrice": 859.75,
      "lastSeenTs": "...",
      "lastSeenPrice": 870.10,
      "peakPrice": 1014.53,
      "peakTs": "...",
      "troughPrice": 859.75,
      "troughTs": "...",
      "snapshots": [
        { "ts": "...", "price": 859.75, "liquidityUsd": 116406, "marketCap": 8597558,
          "fdv": 8597558, "h1": 12.6, "h6": -10.5, "h24": 27.9 }
      ]
    }
  }
}
```

## Poller

- File: `dashboard/scripts/poll-prices.mjs`
- Runs in plain Node (no build step).
- Source of truth for which tokens to track: regex over `portfolio.md` headings of the form `### SYMBOL (chain) — \`address\``.
- Section context (Active / Watchlist / Rejected timelines) flows into `source` field — used by UI for filtering and for grading "was the rejection correct".
- DexScreener endpoint: `https://api.dexscreener.com/tokens/v1/{chainId}/{addr1,addr2,...}` — free, no key, batches up to 30 addresses per call.
- Picks the most-liquid pair per token.
- Snapshots are append-only; same-timestamp re-runs overwrite the latest sample (idempotent).

## Run cadence

| Mode | Command | Use |
|------|---------|-----|
| One-shot | `npm run poll` | manual checkpoint, end of pipeline cycle |
| Loop | `npm run poll:loop` | shell loop, 60s interval — leave running while trading |
| Cron | `*/5 * * * * cd .../dashboard && /usr/local/bin/node scripts/poll-prices.mjs` | unattended |

## UI surface

`MarketPanel` (homepage) renders two extra columns next to live PnL:

- **since** — `% (lastPrice − firstSeenPrice) / firstSeenPrice` — answers "was spotting this token a good call?"
- **peak** — best `% since spot` ever recorded — answers "did we leave money on the table by passing?"

Tooltip on the `since` cell shows: first-seen age, spot price, peak %, trough %, sample count. Mirrors the holistic time-view philosophy already encoded in `portfolio.md`.

## Grading rubric (call quality)

| pipeline verdict | since spot result | reading |
|------------------|-------------------|---------|
| **rejected** | trough deepens, peak < +20% | hard kill was correct |
| **rejected** | peak > +100% | false negative — review what gate over-fired |
| **watch (no entry)** | peak > +50% | missed real opportunity — was the entry trigger too strict? |
| **watch (no entry)** | sideways or down | watch was prudent; pass was right |
| **active hold** | since-spot > 0 | pipeline + sizing both working |
| **active hold** | since-spot < stop band | size held but stop logic deserves audit |
| **closed (stop)** | peak after exit > +50% | stop possibly too tight — log to `sm-exit-pattern.md` |

## Known gaps

- **Pair selection sticks to DexScreener** — fine for memecoins, blind for tokens that migrate venues.
- **No SM/holder telemetry** — only price, liq, mcap, h1/h6/h24. Cross-reference Nansen manually for the deeper read.
- **`source` mis-tag risk** — if a token moves between sections in `portfolio.md`, the latest poll overwrites `source`. History array is unaffected.
- **No alerting yet** — caller must read the JSON or dashboard. Adding webhook on `pctSinceSpot` thresholds is a one-day add.

## Cross-references

- `paper-portfolio-active.md` — current open positions, source of token list
- `monotonic-netflow-score.md` — netflow signal compared against price trajectory ex-post
- `sm-exit-pattern.md` — stop / lookback rules tested against `peakPctSinceSpot` after-exit
- `cheap-gate-ordering.md` — false-positive / false-negative grading feeds back into gate ordering
