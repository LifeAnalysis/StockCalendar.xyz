# AImeme — Memecoin Discovery Pipeline

**TL;DR:** Automated pipeline that scans ETH, Base, Solana, Arbitrum every cycle, surfaces young memecoins ($100k–$1M mcap, <14 days old) with real smart-money accumulation, and rejects rugs/trojans/backdoors before any spend. Built on agentcash + Nansen + Rugcheck. ~$0.20 per fully-vetted token.

---

## How it works (8 steps, cheapest-kill-first)

```
0. DISCOVER     GeckoTerminal trending + Nansen smart-money netflow      $0.01
1. PRE-FILTER   regex (SCAM/RUG/HONEY), wash ratios, dust, dump pattern  $0
2. CACHE        30-min adaptive TTL (5min for fresh tokens)              $0
3. SAFETY       OnchainExpat AI (EVM) + Rugcheck.xyz (Solana free)       $0.10
                Kills: honeypot, trojan, launchpad backdoor, proxy clone
4. ENRICH       Holders + Smart Money + Creator (parallel, 3 calls)       $0.11
5. HARD GATES   top1 >25%, identical-stack bundle, dev-snipe              $0
5.5 SCORE       Graduated 4-pt: SM signal, LP locked, monotonic NF, creator clean
5.6 SM-EXIT     Verify active vs exited SM (Nansen trader_count = lifetime, lies)
6. SIZING       Tier-based: S/A=$150-200, B=$100, C=$75, D=$50
7. STOP/TP      Tier-specific trailing stops + take profits
```

---

## What it caught in first 3 days (validated 2026-04-28)

| Token | Verdict | Why |
|-------|---------|-----|
| **DWH** | 🔴 REJECT | Trojan library masquerading as OpenZeppelin Math. Hidden `sstore` writes arbitrary storage slots. Would've drained any wallet. |
| **ARMA / NICE** | 🔴 REJECT | Livo launchpad clones — permanent unlimited allowance over all holders. Built-in rug. |
| **CMD** | 🔴 REJECT | EIP-1167 minimal proxy with unknown implementation. Blind clone. |
| **MYSTERY** | 🔴 REJECT | 19-wallet identical-stack bundle, zero outflow = sniper coordination. |
| **LEVR** | 🔴 REJECT | Nansen showed "16 traders" lifetime — actually 4 active vs 21 exited. Distribution masked as accumulation. |
| **EMPLOYEE** | 🔴 REJECT | All smart money entered + exited in 24h. Bearish exit signal. |
| **lumi** | 🔴 REJECT | Top1 holder 29.52% even with LP locked — single-wallet dump risk. |
| **uPEG** | 🟢 BUY | 10+ active smart traders holding $340k = 41% of pool. Clean distribution. |
| **ROO** | 🟡 BUY (C-tier) | LP 100% locked, monotonic netflow, 3 active vs 2 exited (healthy). Half-position $75. |

---

## Paper Portfolio — Tier sizing v4.0

Hard kills are binary, score is **size**. Borderline = small bet, not zero bet.

| Tier | Score | Allocation | Stop | TP |
|------|-------|-----------|------|-----|
| **S** | 4/4 + convicted SM | $200 | -30% trail | scale 50% @ +100% |
| **A** | 4/4 | $150 | -30% trail | scale 50% @ +100% |
| **B** | 3.5/4 | $100 | -25% trail | exit @ +75% |
| **C** | 3/4 | $75 | -20% tight | exit @ +60% |
| **D** | 2.5/4 | $50 | -15% hard | exit @ +40% |

Current open positions (paper, 2026-05-04): uPEG A-tier $150, bENAT D-tier spray $50, KIMCHI D-tier spray $50. ROO/HENRY/Dunald/PUNK are closed. Spray entries are discretionary experiments, not strict pipeline BUY signals.

---

## Key architectural learning

Every aggregate metric (24h, 7d, lifetime trader_count) **lies about current dynamics**. The pipeline always cross-checks aggregate vs instantaneous (m5/m15/m30):

- Trending h24 +200% is dead if h6 < h1 and m30 sells > buys
- "16 smart traders" means nothing without active-vs-exited split
- Inflow_fdv_ratio 60x is wash bot residue unless m5 has 20+ unique buyers
- Netflow positive on 6h can hide active dump on 1h

Six explicit aggregate-vs-instantaneous rules built into v3.9.

---

## Stack

- **Discovery**: GeckoTerminal trending API, Nansen smart-money netflow
- **Safety**: OnchainExpat (EVM, AI contract analysis), Rugcheck.xyz (Solana, free)
- **Holders/SM**: Nansen TGM holders endpoint with smart_money label filter
- **Payments**: agentcash gateway (USDC on Base via x402 protocol, no API keys)
- **Persistence**: file-based memory + paper portfolio with timeline per token

Total cost per cycle (4 chains, ~20 candidates surveyed): $0.20–$0.50.

---

## Why it works

Not because the score is calibrated (it's not — 30+ outcomes needed for real regression). It works because **hard kills run before any paid call**. 70% of survivors die at the $0.10 safety scan. That's the alpha: cheap rejection of rugs that look identical to gems on the surface.

uPEG is the only confirmed BUY in 3 days of scanning. Everything else either rugged, bundled, or distributed before retail noticed.
