# Hermes Robinhood Chain

Hermes Robinhood Chain is a Next.js research command center for Robinhood Chain testnet stock tokens. It combines official testnet token contracts with public market context, Kalshi prediction-market data, SEC filings, GDELT news, earnings calendars, historical chart data, and an OpenRouter-powered Hermes summary layer.

The product is intentionally research-first. It does not claim to execute trades, and the quote endpoint is disabled until a provider with explicit Robinhood Chain stock-token support is configured.

## What It Does

- Shows the supported Robinhood Chain stock universe: `TSLA`, `AMZN`, `PLTR`, `NFLX`, and `AMD`.
- Keeps the classic DEX-style buy/sell ticket visible while separating quote readiness from unsupported execution.
- Loads Hermes intelligence progressively so the UI is usable before slower model output finishes.
- Explains why Hermes does or does not support a stock route.
- Breaks down confidence into the same evidence categories used by the backend scoring model.
- Displays earnings context, recent earnings backtests, public news, SEC filing links, latest quote snapshots, and Kalshi YES/NO market pricing.
- Shows data-source health and provenance for every major upstream feed.
- Records a local post-trade/quote journal when quote events or transaction hashes exist.
- Uses optimized motion-icon assets under `public/media/icons` with originals preserved under `assets/originals`.

## Current Product Surface

The main app is a two-column stock desk:

- **Left side:** buy/sell ticket, supported stock strip, earnings calendar, and stock selection.
- **Right side:** selected-stock research panel with chart ranges, Hermes output, confidence breakdown, reasoning graph, earnings backtest, prediction-market overlay, data provenance, and local journal.

### Hermes Panels

- **Hermes output:** OpenRouter final vote plus user-facing textual output, with deterministic fallback only when the model is unavailable.
- **Why this route?:** selected source/target token route, wallet/network/quote state, and key evidence chips.
- **Confidence decomposition:** point-by-point confidence contribution from Kalshi market quality, earnings, quote data, SEC, news, and market breadth, with route/explorer shown separately as readiness checks.
- **Reasoning graph:** visual evidence graph linking route, public sources, market context, and Hermes decision.
- **Earnings backtest:** previous earnings events with post-event move, news count, Kalshi context, and concise analysis.
- **Prediction-market overlay:** matched Kalshi markets, YES/NO bid/ask, liquidity, close time, and match quality.
- **Data provenance:** source status table for Robinhood contracts, Kalshi, calendars, Stooq/Yahoo, SEC, GDELT, and explorer discovery.
- **Post-trade journal:** local `localStorage` journal of quote-ready/rejected or transaction-confirmed events.

## Execution Boundary

Robinhood Chain stock-token quote preparation is currently disabled:

- `/api/robinhood/trade` validates the expected request shape and then returns an explicit unsupported-provider response.
- Nuvolari integration was removed because Nuvolari does not support Robinhood Chain stock tokens.
- Wallet connection can still be used for UI readiness and future integration work.
- A real quote provider must return wallet-signable transaction data before the signing flow should be enabled again.

## Data Sources

Hermes uses only machine-readable data sources that the backend can inspect directly:

- **Robinhood Chain docs/contracts:** official token universe and payment tokens.
- **Robinhood Chain explorer:** token discovery and contract confirmation context.
- **Kalshi public Trade API:** open public market and series data, locally filtered against stock symbols and company names.
- **Stooq:** public latest quote snapshots.
- **Yahoo Chart:** historical OHLC chart ranges and earnings backtest price windows.
- **MarketBeat/public calendar links:** earnings date and estimate context where available.
- **SEC EDGAR submissions:** recent material filings and filing document links.
- **GDELT/Yahoo Finance RSS:** recent stock-related article counts and top titles.
- **OpenRouter:** optional natural-language Hermes summaries and earnings-event analysis.

Hermes does not use Kalshi website search pages as source data because those pages can be noisy, protected, or unrelated to stock-specific markets.

## API Routes

```text
app/page.tsx                         Frontend command center
app/api/health/route.ts              Runtime readiness and source configuration
app/api/chat/route.ts                Hermes chat wrapper over the same stock intel
app/api/hermes/output/route.ts       Hermes selected-stock intelligence payload
app/api/hermes/backtest/route.ts     Previous-three-earnings backtest per stock
app/api/robinhood/intel/route.ts     Aggregated source checks, recommendations, and agent context
app/api/robinhood/stocks/route.ts    Supported stock/payment token dictionary
app/api/robinhood/status/route.ts    Robinhood Chain RPC status
app/api/robinhood/trade/route.ts     Disabled quote endpoint until a supported provider exists
app/api/stocks/chart/route.ts        Yahoo Chart OHLC data for chart ranges
```

## Key Modules

```text
lib/robinhood.ts              Official stock/payment token dictionary, RPC status, disabled quote boundary
lib/intel.ts                  Main data pipeline, pipeline checks, recommendations, Hermes decision model
lib/kalshi.ts                 Kalshi market/series fetching and stock-market matching
lib/calendar.ts               Earnings date and estimate fetching with public fallback links
lib/stock-signals.ts          Stooq, Yahoo Chart, SEC EDGAR, and GDELT stock signals
lib/hermes-output.ts          OpenRouter prompt boundary and deterministic fallback output
lib/earnings-backtest.ts      Earnings backtest, optional Postgres cache, OpenRouter event analysis
lib/postgres.ts               `DATABASE_URL` / `POSTGRES_URL` cache connection helper
src/App.jsx                   Main UI and Hermes research panels
src/components/*              Chart, reasoning graph, and UI primitives
```

## Environment

Most values have defaults, but production should provide real API keys and contact details where relevant.

```bash
# OpenRouter, optional but recommended for natural-language Hermes summaries.
OPENROUTER_API_KEY=
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_MAX_TOKENS=4096
OPENROUTER_TIMEOUT_MS=90000

# Optional persistent cache for earnings backtests.
DATABASE_URL=
EARNINGS_BACKTEST_CACHE_HOURS=24

# Kalshi public market data.
KALSHI_API_BASE_URL=https://external-api.kalshi.com/trade-api/v2
KALSHI_MARKET_CACHE_SECONDS=180
KALSHI_MAX_MARKET_PAGES=12
KALSHI_SOURCE_TIMEOUT_MS=30000
KALSHI_USE_BROAD_SCAN=false
KALSHI_USE_SERIES_SCAN=true
KALSHI_MAX_SEARCH_TERMS=32
KALSHI_MAX_SERIES_PER_STOCK=4
KALSHI_TARGETED_MARKET_PAGES=0

# Source-level timeouts.
CALENDAR_SOURCE_TIMEOUT_MS=15000
EXPLORER_SOURCE_TIMEOUT_MS=6000
STOCK_SIGNALS_TIMEOUT_MS=20000
STOCK_SIGNALS_CACHE_SECONDS=300
STOOQ_TIMEOUT_MS=6000
YAHOO_CHART_TIMEOUT_MS=6000
YAHOO_CHART_RANGE=3mo
YAHOO_CHART_INTERVAL=1d
SEC_TIMEOUT_MS=8000
SEC_USER_AGENT=hermes-agent-backend/2.0 your-email@example.com
GDELT_TIMEOUT_MS=6000
GDELT_MAX_RECORDS=25
YAHOO_NEWS_TIMEOUT_MS=6000
YAHOO_NEWS_COUNT=6

# Robinhood Chain server-side RPC.
ROBINHOOD_CHAIN_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/...
ROBINHOOD_CHAIN_ID=46630
ROBINHOOD_CHAIN_EXPLORER_URL=https://explorer.testnet.chain.robinhood.com/

# Browser wallet config.
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_REOWN_PROJECT_ID=
NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/...
NEXT_PUBLIC_ROBINHOOD_CHAIN_ID=46630
NEXT_PUBLIC_ROBINHOOD_CHAIN_EXPLORER_URL=https://explorer.testnet.chain.robinhood.com/
```

### Database URL

`DATABASE_URL` is a Postgres connection string used only for the Hermes earnings backtest cache. If it is not set, the app falls back to in-memory caching for local development.

Valid providers include Railway Postgres, Vercel Postgres, Neon, and Supabase. The app also accepts `POSTGRES_URL` as a fallback in `lib/postgres.ts`.

## Media Assets

Motion-icon originals live in:

```text
assets/originals/
```

Optimized app assets live in:

```text
public/media/icons/
```

The optimized versions are generated at roughly 160px, 24fps, no audio, with WebM VP9 plus MP4 H.264 fallback. Regenerate them with:

```bash
scripts/compress-motion-icons.sh
```

Optional overrides:

```bash
MAX_SIZE=96 FPS=18 MP4_CRF=22 WEBM_CRF=32 scripts/compress-motion-icons.sh
```

The full background video is intentionally left at `public/media/app-background.mp4`.

## Development

```bash
npm install
npm run env:check
npm run dev:watch
```

Useful commands:

```bash
npm run build      # production build
npm run lint       # lint
npm run check      # lint + build
npm run dev        # production-like local boot: env check, build, start
npm run dev:loose  # UI-only dev without env validation
```

`npm run dev` validates local runtime env, clears stale `.next` output, builds, and starts the app like production. Use `.env.local` for real local values.

## Deployment

The repository is configured as a Next.js app. Production needs:

- domain-allowlisted Reown project ID
- browser-safe Robinhood Chain RPC URL
- server-side Robinhood Chain RPC URL
- real SEC user-agent contact
- optional OpenRouter key
- optional Postgres `DATABASE_URL` for persistent backtest cache

Quote execution should stay disabled until a supported Robinhood Chain stock-token quote provider is integrated and verified.

## Notes

- These Robinhood Chain stock tokens are testnet assets and have no real economic value.
- Hermes recommendations are research/explainability outputs, not financial advice.
- Kalshi data is used as supporting public prediction-market context, not as an execution venue.
- The UI should surface degraded source warnings rather than hiding missing data.
