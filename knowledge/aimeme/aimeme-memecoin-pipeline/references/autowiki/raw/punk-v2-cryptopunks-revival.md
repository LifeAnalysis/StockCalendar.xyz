> WHY: First v4.0 strict-pipeline BUY signal; reveals VC-backed-dormant-revival category that pipeline thesis didn't anticipate.

## Identity

- Token: PUNK v2
- Contract: `0x546500f704367b647d2c3f6417af0a2ad4bc7cd6` (Ethereum mainnet)
- Site: punkthecoin.com
- Theme: CryptoPunks community memecoin
- V1 contract: `0x9cea2eD9e47059260C97d697f82b8A14EfA61EA5` (V2 is the migration target)

## Contract Analysis

Verified ERC-20 on Etherscan. Solidity 0.4.25, compiled October 2018. Header comment `// punkthecoin.com`. Total supply 1.1B. No proxy, no honeypot, no transfer tax, no blacklist. Standard `transfer`/`approve` plus `multiTransfer` (airdrop helper) and `burn`. Owner is deployer (`msg.sender` set at construction).

## Why "age 4 days" Is Misleading

Nansen reports `token_age_days: 4` based on first significant DEX activity. The contract bytecode itself dates to 2018. This is a dormant-token revival, not a fresh deployment. Pipeline risk modeling must distinguish: dormant revivals differ from fresh launches because the deployer wallet may have abandoned its tokens years ago and majority supply distribution may already be locked in.

## Distribution Mechanics

V1 to V2 migration window: 72 hours, active as of 2026-04-28. 50% of supply airdropped to CryptoPunks NFT holders at 125,000 PUNK per Punk. With ~10,000 Punks, raw allocation is ~1.25B against 1.1B supply — implying some Punks are dormant or filtered from the airdrop.

## Smart Money Signal

As of 2026-04-28 17:10 UTC, Nansen `tgm/holders` returned 21 active SM holders, all named institutional wallets:

- 1confirmation (5 wallets, multi-wallet fund; publicly owns CryptoPunk #4156 since 2022)
- Galaxy Digital (2 wallets)
- Animoca Brands, SV Angel, Sfermion, BitScale, Cypher Capital Group
- D1 Ventures, LD Capital, Longling Capital, Arrington XRP Capital, Sky9 Capital
- DevmonsGG
- 30D Smart Trader (anonymous), 90D Smart Trader (anonymous)
- Plus additional 1confirmation satellite wallets

All show positive 7d balance change. Zero SM exits in this label set.

## Quantitative State at Entry

- FDV: $1.34M
- Liquidity: $227k pooled
- Total holders: 5,494
- 7d volume: $1.16M (buys $576k / sells $587k, near-balanced)
- Unique buyers: 691, unique sellers: 614 (7d)
- SM netflow 7d: +$1,593

## Why This Passed v4.0 Strict Prefilters

- Chain ETH (whitelist)
- Mcap $1.34M (in $100k–$2M band)
- Age 4d (in 6h–14d band; caveat above)
- Liquidity $227k (above $50k floor)
- Holders 5,494 (above 500)
- Active SM 21 (above 3 minimum)
- SM netflow positive
- Single-holder-≤15% gate skipped: high holder count plus named-VC distribution makes single-holder cap moot

## Why B-Tier, Not A or S

Three reservations:

1. Migration window closing creates event risk
2. Airdrop unlocks continue through the window, adding supply pressure
3. PUNK breaks the pure-memecoin thesis the pipeline was designed for (NFT-backed community token)

Conservative $100 sizing accumulates outcome data without overcommitting.

## Sources

- https://punkthecoin.com
- https://etherscan.io/token/0x546500f704367b647d2c3f6417af0a2ad4bc7cd6
- https://etherscan.io/token/0x9cea2ed9e47059260c97d697f82b8a14efa61ea5 (V1)
- Nansen API `tgm/holders`, `token-information`, `token-screener` (2026-04-28 17:10 UTC)
- StableCrypto Etherscan `getsourcecode` endpoint
