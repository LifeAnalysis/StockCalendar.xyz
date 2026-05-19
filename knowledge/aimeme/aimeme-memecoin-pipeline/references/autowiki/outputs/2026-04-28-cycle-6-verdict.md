> WHY: cycle 6 (~21:30 GMT+7) full audit trail. 20 trending pools, 0 BUY, 0 WATCH. Records every reject reason for regression set.

# Cycle 6 verdict — 2026-04-28 21:30 GMT+7

**Source**: GeckoTerminal `/onchain/trending` duration=1h ($0.01)
**Pipeline**: v3.9 canonical (v4.0 staged, not active)
**Spend**: $0.02 (trending + 1 GoPlus free)

## Pool-by-pool

| # | Token | Chain | FDV | Liq | Verdict | Gate fired |
|---|---|---|---|---|---|---|
| 1 | wojak | eth | $23M | $916k | REJECT | step 0.5 trending-but-dead — h24-19%, m30 sells>buys |
| 2 | SCAM (Altman) | sol | $8.8M | $322k | REJECT | symbol regex `/^SCAM/` |
| 3 | MASCOTS | sol | $729k | $76k | REJECT step 3 | rugcheck score 16 (<20), LP 0%, Token2022 |
| 4 | ZK | bsc | $12M | $1M | SKIP | bsc out of pipeline scope |
| 5 | MEMEMEMORY | sol | $329k | $44k | REJECT | liq <$50k floor |
| 6 | ORCA | sol | $129M | $977k | SKIP | est 2y, not meme |
| 7 | BULL | sol | $5.2M | $284k | REJECT | age 36d > 14d band |
| 8 | CAS | base | $9.1M | $392k | REJECT step 5 | GoPlus top1 EOA 85%, unlocked |
| 9 | HRP | sol | $398k | $275k | REJECT | wash signature — m5/m15/m30 buys≈sells, 25 unique buyers vs 127 buys |
| 10 | RAVE | bsc | — | — | SKIP | bsc |
| 11 | uPEG | eth | $8.7M | $758k | SKIP | already BUY (open) |
| 12 | SCAM #2 | sol | — | — | REJECT | regex |
| 13 | AIOT | bsc | — | — | SKIP | bsc |
| 14 | BTW | bsc | — | — | SKIP | bsc |
| 15 | WLD (werldcoin) | sol | $179k | $33k | REJECT | liq <$50k AND mcap <$100k |
| 16 | HENRY | sol | $412k | $72k | SKIP | open paper position |
| 17 | ZEREBRO | sol | $18M | $1.7M | REJECT | est >14d, m30 sells>buys |
| 18 | ANNIE | sol | $63k | $21k | REJECT | liq + mcap <floor |
| 19 | MAGA | sol | $15M | $408k | REJECT | known SM-exit (16 exited h prior cycle) |
| 20 | musk | sol | $328k | $46k | REJECT | liq <$50k floor |

## Net

- 0/20 BUY, 0/20 WATCH, 0/20 ALMOST
- 7 rejected at structural gates (regex/age/liq/wash)
- 1 rejected at safety scan (MASCOTS LP=0)
- 1 rejected at hard gate (CAS top1=85%)
- 5 skipped (bsc) — pipeline scope mismatch
- 6 skipped (already in book or non-meme)

## Infra issues

- **OnchainExpat `/api/x402-crypto/token-safety` returns 404** at 2026-04-28 21:30 (both x402 and x402r variants). Pipeline `Wired tools` line is stale. Fallback used: **GoPlus `api.gopluslabs.io/api/v1/token_security/{chainid}` — free public, no auth, no payment**.
- Allium MCP credits exhausted — irrelevant, Allium not in pipeline (scratched earlier confusion).

## Lessons → wiki.proposed

1. `goplus-evm-safety-fallback.md` — replacement for dead OnchainExpat path
2. `wash-via-symmetric-buy-sell.md` — HRP-style detection (buys==sells across all timeframes + unique<<count)
3. `bsc-out-of-scope-tagging.md` — auto-skip during prefilter, save reweave noise
