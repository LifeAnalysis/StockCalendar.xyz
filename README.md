# Hermes Robinhood Chain

Next.js command center for Robinhood Chain stock tokens, Kalshi market context, public event links, and Nuvolari/Arqsy quote preparation.

The app does not sign transactions. It prepares atomic stock buy/sell/rotate quotes only after exact token contracts, wallet EOA, and integer base-unit amount are present.

## Stack

```text
app/page.tsx                       Frontend command center
app/api/health/route.ts            Runtime readiness
app/api/robinhood/status/route.ts  Robinhood Chain RPC status
app/api/robinhood/stocks/route.ts  Stock token dictionary
app/api/robinhood/intel/route.ts   Robinhood + Kalshi + calendar aggregate
app/api/robinhood/trade/route.ts   Atomic stock quote preparation
lib/robinhood.ts                   Official stock/payment token dictionary and trade rail
lib/kalshi.ts                      Kalshi public market fetch + matcher
lib/calendar.ts                    Public earnings/event lookup
```

## Environment

```bash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=deepseek/deepseek-v4-flash

KALSHI_API_BASE_URL=https://external-api.kalshi.com/trade-api/v2
KALSHI_MARKET_CACHE_SECONDS=180
KALSHI_MAX_MARKET_PAGES=12

NUVOLARI_API_BASE_URL=https://api.staging.nuvolari.ai
NUVOLARI_API_KEY=
NUVOLARI_SECRET_API_KEY=
NUVOLARI_EXECUTION_QUOTE_PATH=/v1/execution/quote
NUVOLARI_EXECUTION_EXECUTE_PATH=/v1/execution/execute

ROBINHOOD_CHAIN_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/...
ROBINHOOD_CHAIN_ID=46630
ROBINHOOD_CHAIN_EXPLORER_URL=https://explorer.testnet.chain.robinhood.com/
ROBINHOOD_STOCK_PROVIDER=nuvolari

ARQSY_API_BASE_URL=
ARQSY_API_KEY=
ARQSY_SECRET_API_KEY=
ARQSY_STOCK_TRADE_PATH=/v1/stocks/trade
```

## Source Of Truth

Robinhood stock tokens are currently the official testnet contracts from `https://docs.robinhood.com/chain/contracts/`: `TSLA`, `AMZN`, `PLTR`, `NFLX`, and `AMD`, plus payment tokens `WETH` and `USDG`.

Kalshi market data uses the public Trade API. Calendar data uses public finance endpoints where available and always returns fallback public links for manual inspection.

## Development

```bash
npm install
npm run dev
npm run build
```
