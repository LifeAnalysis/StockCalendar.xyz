> WHY: Captures the consensus filter settings used across professional onchain memecoin terminals (Photon, BullX, GMGN, Axiom) so our pipeline gates align with what working snipers actually run in 2026.

# Consensus Filter Settings — Photon, BullX, GMGN, Axiom (2026)

The four dominant Solana memecoin terminals — Photon, BullX, GMGN, and Axiom — converge on a near-identical filter stack for prefiltering trending and new-pool feeds. Below is the consensus configuration distilled from professional sniper writeups and terminal-ranking surveys.

## Market Cap and Age

- Market-cap floor for snipe entries: $9,000. Below this, liquidity and price-discovery noise make sniping coin-flip variance.
- Age window for snipe entries: under 30 minutes from launch.
- "Super Degen" tier window: 0 to 48 hours since launch.
- "Degen" tier window: 0 to 72 hours since launch.

## Holder Distribution

- Top-10 holder cap: under 30 percent of supply. Tighter than Nansen's 40 percent ceiling because terminal users trade earlier in the lifecycle where concentration risk is higher.
- Bundle (single-tx multi-wallet) concentration: under 10 percent.
- Airdrop allocation: under 10 percent preferred, 20 percent absolute maximum.

## Holder Behavior Signals

- Holder-dump alert: more than 10 percent of the airdrop supply moving out of recipient wallets is treated as a distribution event and triggers exit.

## Why These Numbers

The numbers reflect terminal users trading inside the first three days post-launch where noise dominates and only sharp distribution filters survive. The consensus also reflects copy-pasting between guides — operators converge on the same stack because deviation costs money fast.

## Sources

- Medium memecoin sniping guides (2025–2026 vintage)
- QuickNode "Top Solana Sniper Bots" engineering writeup
- Crypto-Reporter terminal rankings 2026 survey
