> WHY: Defines the quantitative health thresholds Nansen publishes for evaluating Solana tokens in 2026; serves as the external benchmark our pipeline gates are calibrated against.

# Nansen 2026 Solana Token Evaluation Framework

Nansen's 2026 framework provides specific numeric thresholds for assessing the on-chain health of a Solana token across liquidity, distribution, volume, exchange flow, venue concentration, and smart-money behavior. Below is a structured extract of the load-bearing numbers.

## Liquidity

- Memecoin liquidity floor: minimum $100,000 in pooled liquidity is the threshold below which slippage and exit-risk make positions unviable.
- Market-cap-to-liquidity ratio: any value above 50x is flagged as "danger" — illiquid relative to nominal valuation, prone to single-wallet collapse.

## Holder Distribution

- Top-10 holder concentration: a healthy token has top-10 wallets holding no more than 40 percent of supply.
- Above 40 percent: rug-vector risk and coordinated dump risk dominate.

## Volume

- Healthy daily volume-to-market-cap band: 10 to 30 percent.
- Below 10 percent: stagnant, no organic interest.
- Above 30 percent sustained: typically wash trading or distribution by insiders.

## Exchange Flow

- CEX deposit alert: more than 5 percent of circulating supply moving to centralized-exchange deposit addresses inside a 24-hour window is treated as a sell-side warning signal.

## Venue Concentration

- Single-DEX concentration: 80 percent or more of liquidity sitting on one DEX is flagged as concentration risk — a single venue failure or LP pull collapses the market.

## Smart Money Conviction

- Coordinated-conviction signal: 10 or more Nansen-labeled smart-money wallets entering inside a 48-hour window indicates conviction clustering, not noise.

## Sources

- https://www.nansen.ai/post/solana-token-analysis-complete-framework-for-evaluating-tokens-in-2026
