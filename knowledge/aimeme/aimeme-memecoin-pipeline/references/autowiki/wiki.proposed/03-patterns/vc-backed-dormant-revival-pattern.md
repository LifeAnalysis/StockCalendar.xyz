---
id: 34
category: patterns
function: Detect VC-Revival Pattern
status: proposed
related: [12, 24, 22, 42]
---
# VC-Backed Dormant Revival Pattern

A token-launch category where an OLD smart contract (months or years dormant, often pre-2020 ERC-20) gets resurrected by recent (≤7 day) DEX liquidity addition or migration, then a cluster of NAMED institutional wallets accumulates within 24-48 hours under an "OG community memecoin reborn" narrative. Distribution is typically tied to NFT holder airdrop or an on-chain claim mechanic. `DerivedFrom [[raw/punk-v2-cryptopunks-revival.md]]`.

## Why It Breaks v3.9 Assumptions

The v3.9 `token_age_days` check assumed fresh contract deployment. v4.0 prefilters happen to pass these tokens because they meet structural gates (mcap, liq, holders, SM ≥ 3) per `[[raw/v4-0-strict-prefilter-thresholds.md]]` — but the underlying risk profile is fundamentally different from pump.fun launches. `Extends [[../pipeline.md]]`.

Risk profile DIFFERS from fresh launches: deployer wallet may have abandoned the token years ago, majority supply may already be distributed via airdrop, and tax/honeypot mechanisms are unlikely (2018-era Solidity predates those tricks) `[[raw/punk-v2-cryptopunks-revival.md]]`.

Risk profile DIFFERS from established memes: liquidity is shallow, price discovery is happening NOW, and supply unlock from airdrop continues `[[raw/punk-v2-cryptopunks-revival.md]]`.

Event risk is HIGHER: migration windows end, airdrop claims close, narrative resets. Specific deadlines must be tracked `[[raw/punk-v2-cryptopunks-revival.md]]`.

## Detection Signals

- `token_age_days < 14` AND `contract deployment year < 2024` → revival flag `[[raw/punk-v2-cryptopunks-revival.md]]`.
- `≥10 named-VC wallets accumulating in 24h` (Nansen non-anonymous SM labels) → high-conviction revival. `Supports [[raw/nansen-2026-token-framework.md]]` — Nansen's "10+ SM in 48h coordinated conviction" rule fired correctly here.
- Site-name pattern: `<token>thecoin.com`, `<token>.fun`, or NFT-collection-name domain → community-airdrop pattern `[[raw/punk-v2-cryptopunks-revival.md]]`.

## Case Study — PUNK v2 (2026-04-28)

Verbatim from `[[raw/punk-v2-cryptopunks-revival.md]]`: 21 named-VC SM wallets accumulated in 24h — 1confirmation x5, Galaxy Digital x2, Animoca, SV Angel, Sfermion, BitScale, Cypher Capital, D1, LD, Longling, Arrington XRP, Sky9, DevmonsGG, plus anonymous Smart Trader labels. Contract is Solidity 0.4.25 from 2018. CryptoPunks 1:1 v1→v2 migration with a 72h window and 50% supply airdrop. First v4.0 strict-pipeline BUY signal entered as B-tier $100 — conservative sizing because thesis hybridity (NFT-backed, not pure meme) and event risk (migration ending) were not anticipated by pipeline scoring.

## Sizing Recommendation

- Default: B-tier $100 — event risk, thesis hybridity, supply unlock `[[raw/punk-v2-cryptopunks-revival.md]]`.
- Upgrade to A-tier $150 only if ALL named-VC wallets are net-positive over 7d AND migration window has ≥5 days remaining AND cumulative holder count is growing >10%/day `[[raw/punk-v2-cryptopunks-revival.md]]`.
- Never S-tier for revival pattern — too much event risk for max sizing `[[raw/punk-v2-cryptopunks-revival.md]]`.

## Cross-Links

- `Implements [[sm-conviction-floor]]` — applies the mandatory SM gate.
- `Extends [[../pipeline.md]]` — adds revival category to pipeline thesis taxonomy.
- `Contradicts [[lp-locked-tristate.md]]` (partial) — V4 LP-unknown shouldn't auto-pass for old contracts; dormant-revival category needs different LP gating logic.
- `DerivedFrom [[raw/punk-v2-cryptopunks-revival.md]]` — sole case study so far.
- `Supports [[raw/nansen-2026-token-framework.md]]` — the named-VC clustering rule fired correctly on PUNK v2.

## Open Questions

1. What's the historical hit rate for VC-revival vs pump.fun launches? Need 5+ revival entries to know.
2. Do anonymous "Smart Trader" labels add signal beyond the named-VC count, or are they noise?
3. Is there a Dune query that surfaces dormant-contracts-with-recent-liquidity directly?

<!-- sources:
raw/punk-v2-cryptopunks-revival.md sha256:607f7fc9857889d659a1c54b39df2864fbf74a7f238196a9a775ce0d624cddca
raw/nansen-2026-token-framework.md sha256:be7f91beb39e52ddaf7b3c420b23d7f56e84bfa018c003f719e391953dbb9dd2
-->
