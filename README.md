# Hermes Robinhood Chain

Next.js command center for Robinhood Chain stock tokens, Kalshi market context, public event links, SEC/news signals, and Hermes research.

The app does not sign transactions. Quote preparation is disabled until a provider with Robinhood Chain stock-token support is configured.

## Stack

```text
app/page.tsx                       Frontend command center
app/api/health/route.ts            Runtime readiness
app/api/robinhood/status/route.ts  Robinhood Chain RPC status
app/api/robinhood/stocks/route.ts  Stock token dictionary
app/api/robinhood/intel/route.ts   Robinhood + Kalshi + calendar aggregate
app/api/robinhood/trade/route.ts   Disabled quote endpoint until a supported provider exists
app/api/chat/route.ts              Hermes chat fed by the same normalized intel payload
lib/robinhood.ts                   Official stock/payment token dictionary and chain helpers
lib/kalshi.ts                      Kalshi public market fetch + matcher
lib/calendar.ts                    Public earnings/event lookup
lib/stock-signals.ts               Stooq quotes, SEC filings, and GDELT news context
lib/intel.ts                       Pipeline checks and compact agent context
```

## Environment

```bash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_TIMEOUT_MS=45000
DATABASE_URL=
EARNINGS_BACKTEST_CACHE_HOURS=24

KALSHI_API_BASE_URL=https://external-api.kalshi.com/trade-api/v2
KALSHI_MARKET_CACHE_SECONDS=180
KALSHI_MAX_MARKET_PAGES=12
KALSHI_SOURCE_TIMEOUT_MS=30000
KALSHI_USE_BROAD_SCAN=false
KALSHI_USE_SERIES_SCAN=true
KALSHI_MAX_SEARCH_TERMS=32
KALSHI_MAX_SERIES_PER_STOCK=4
KALSHI_TARGETED_MARKET_PAGES=0
CALENDAR_SOURCE_TIMEOUT_MS=8000
EXPLORER_SOURCE_TIMEOUT_MS=6000

STOCK_SIGNALS_TIMEOUT_MS=12000
STOCK_SIGNALS_CACHE_SECONDS=300
STOOQ_TIMEOUT_MS=6000
YAHOO_CHART_TIMEOUT_MS=6000
YAHOO_CHART_RANGE=3mo
YAHOO_CHART_INTERVAL=1d
SEC_TIMEOUT_MS=8000
SEC_USER_AGENT=hermes-agent-backend/2.0 contact@example.com
GDELT_TIMEOUT_MS=3000
GDELT_MAX_RECORDS=25

ROBINHOOD_CHAIN_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/...
ROBINHOOD_CHAIN_ID=46630
ROBINHOOD_CHAIN_EXPLORER_URL=https://explorer.testnet.chain.robinhood.com/

NEXT_PUBLIC_REOWN_PROJECT_ID=
NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/...
NEXT_PUBLIC_ROBINHOOD_CHAIN_ID=46630
NEXT_PUBLIC_ROBINHOOD_CHAIN_EXPLORER_URL=https://explorer.testnet.chain.robinhood.com/
```

## Source Of Truth

Robinhood stock tokens are currently the official testnet contracts from `https://docs.robinhood.com/chain/contracts/`: `TSLA`, `AMZN`, `PLTR`, `NFLX`, and `AMD`, plus payment tokens `WETH` and `USDG`.

Kalshi market data uses the public Trade API series and market feeds, then filters locally against Robinhood stock symbols and company keywords such as Tesla, Amazon, Palantir, Netflix, and Advanced Micro Devices. Hermes does not treat `kalshi.com/search` pages as machine-readable source data, because the website search can surface noisy or protected results that are not a clean execution signal.

Stock context comes from free/no-secret feeds: Stooq public quote CSVs, Yahoo Chart historical OHLC data, SEC EDGAR submissions, and GDELT news search. Calendar data uses public finance endpoints where available and returns public links for manual inspection.

## Data Pipeline

`/api/robinhood/intel` is the aggregate source for Hermes. It returns explicit pipeline checks for Robinhood Chain token contracts, stock signal feeds, Blockscout explorer discovery, Kalshi public markets, and public event calendars, plus per-stock Hermes recommendations and a compact `agent_context` object consumed by `/api/chat`.

`/api/chat` passes that context to OpenRouter when `OPENROUTER_API_KEY` is configured. Without OpenRouter, it still returns a deterministic pipeline-aware response and includes the raw intel payload for inspection.

`/api/hermes/output` returns compact browser-safe data by default. Add `?debug=1` only when the full backend payload is needed for inspection.

The frontend loads in stages: supported stock catalog first, compact stock intel second, and the slower Hermes/OpenRouter response last. While Hermes is running, the UI stays interactive and shows progress instead of blocking the stock desk.

`/api/hermes/backtest?symbol=TSLA` builds the previous-three-earnings table for supported Robinhood Chain stock tokens. It uses curated 2020+ earnings dates, Yahoo Chart OHLC around each earnings date, date-bounded GDELT headlines, Kalshi public market matches when available, and OpenRouter for the concise event read. When `DATABASE_URL` or `POSTGRES_URL` is configured, results are cached in Postgres in `hermes_earnings_backtests`; otherwise the route falls back to in-memory cache for local development.

## Deployment

This repository is configured for Vercel as a Next.js app via `vercel.json`. The active backend is the set of Next API routes under `app/api/*`; external services are OpenRouter, Kalshi public Trade API, Yahoo Finance, Stooq, SEC EDGAR, GDELT, and the Robinhood Chain testnet RPC/explorer.

Use a production Reown project ID with the deployed domain allowlisted. If `NEXT_PUBLIC_REOWN_PROJECT_ID` is empty, wallet connect controls intentionally stay disabled.

## Development

`npm run dev` validates local runtime env, clears stale `.next` output, builds, and starts the app exactly like production. Use `.env.local` for real local values; Vercel encrypted or sensitive env vars can pull as empty strings, so do not assume `vercel env pull` produced a usable local file.

```bash
npm install
npm run env:check
npm run lint
npm run dev
npm run build
```

For hot reload, use `npm run dev:watch`. For UI-only work without external integrations, use `npm run dev:loose`.
