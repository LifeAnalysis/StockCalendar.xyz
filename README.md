# Stockscalendar.xyz

Stockscalendar.xyz - Discover and trade Robinhood Chain stocks, powered by the Hermes research agent.

Stockscalendar.xyz turns the Robinhood Chain stock-token market into something a normal investor can actually navigate. A user who wants to buy tokenized `TSLA` or `AMZN` on-chain should not have to trade blind, without earnings context, prediction-market reads, filings checks, price context, or source provenance. Stockscalendar.xyz uses Hermes to gather, score, and explain the evidence behind every supported stock while leaving execution fully in the user's hands.

Hermes is a genuine research agent, not a chatbot wrapper. It runs a deterministic, multi-source evidence pipeline for each supported Robinhood Chain stock - `TSLA`, `AMZN`, `PLTR`, `NFLX`, and `AMD` - and fuses signals across official contract confirmation, explorer context, Kalshi YES/NO pricing and liquidity, live quote snapshots, earnings calendars and backtests, SEC EDGAR filings, and recent news pressure.

The result is a transparent verdict: `BUY`, `WATCH`, `NO_BUY`, or `CONFIG_NEEDED`. Each verdict includes a confidence breakdown, reasoning graph, and full data-source provenance so the user can see exactly why the agent reached that conclusion. An optional model layer adds a concise natural-language final vote, but it is hard-guardrailed: it can never upgrade weak deterministic evidence into a buy.

## Why It Exists

Tokenized equities are arriving on-chain faster than the tools to understand them. Robinhood Chain needs a discovery and confidence layer, or its stock tokens stay illiquid and intimidating.

Stockscalendar.xyz is that layer: a Bloomberg-terminal-meets-agent front door for on-chain equities. It is designed around the same responsible pattern throughout the app: discover and explain first, sign last.

## Current Product Surface

The app is a two-column trading desk:

- **Left side:** buy/sell ticket, supported stock strip, earnings calendar, and stock selection.
- **Right side:** selected-stock research panel with chart ranges, Hermes output, confidence breakdown, reasoning graph, earnings backtest, prediction-market overlay, data provenance, and local journal.

## What It Does

- Shows the supported Robinhood Chain stock universe: `TSLA`, `AMZN`, `PLTR`, `NFLX`, and `AMD`.
- Keeps the DEX-style buy/sell ticket visible while separating quote readiness, pair availability, and wallet execution.
- Loads Hermes intelligence progressively so the UI is usable before slower model output finishes.
- Explains why Hermes does or does not support a stock route.
- Breaks down confidence into the same evidence categories used by the backend scoring model.
- Displays earnings context, recent earnings backtests, public news, SEC filing links, latest quote snapshots, and Kalshi YES/NO market pricing.
- Shows data-source health and provenance for every major upstream feed.
- Records a local post-trade/quote journal when quote events or transaction hashes exist.
- Uses optimized motion-icon assets under `public/media/icons` with originals preserved under `assets/originals`.

## Hermes Panels

- **Hermes output:** OpenRouter final vote plus user-facing textual output, with deterministic fallback when the model is unavailable.
- **Why this route?:** selected source/target token route, wallet/network/quote state, and key evidence chips.
- **Confidence decomposition:** point-by-point confidence contribution from Kalshi market quality, earnings, quote data, SEC, news, and market breadth, with route/explorer shown separately as readiness checks.
- **Reasoning graph:** visual evidence graph linking route, public sources, market context, and Hermes decision.
- **Earnings backtest:** previous earnings events with post-event move, news count, Kalshi context, and concise analysis.
- **Prediction-market overlay:** matched Kalshi markets, YES/NO bid/ask, liquidity, close time, and match quality.
- **Data provenance:** source status table for Robinhood contracts, Kalshi, calendars, Stooq/Yahoo, SEC, GDELT, and explorer discovery.
- **Post-trade journal:** local `localStorage` journal of quote-ready/rejected or transaction-confirmed events.

## Execution Boundary

The architecture is contract-address-first and safety-first by design. Hermes only routes official Robinhood Chain stock-token and payment-token contracts; explorer-discovered third-party and mock tokens are surfaced as context but never treated as executable.

Robinhood Chain stock-token quote preparation uses Hobin testnet contracts, with RH Swap kept as a fallback discovery surface:

- `/api/robinhood/trade` validates exact `0x` token addresses and prepares wallet-signable transaction data only.
- The endpoint validates the correct chain ID, base-unit amounts, and official contract addresses; symbols are rejected for executable quote requests.
- The primary integrated DEX is Hobin: factory `0xdD427A5AdF55C1ad4e82E6Af8C0Baaab0A2b5515`, router `0xF957Cb7a67180bf70Ca46C7c88F6c2b3Cb9c33B4`.
- Hobin has WETH pairs for the supported official stock tokens: `TSLA`, `AMZN`, `PLTR`, `NFLX`, and `AMD`.
- RH Swap's testnet `MockSwapFactory` at `0xE9a696F428725134AB06454A0CB2E7434e3deC4c` is still recognized, but its official stock-token pairs were not liquid at integration time.
- If a stock token has no pair or no liquidity, the endpoint returns an explicit `no_pair` or `no_liquidity` response.
- Nuvolari integration is not used because Nuvolari does not support Robinhood Chain stock tokens.

Hermes never signs for the user. It prepares wallet-signable, properly formed quote payloads; the signing boundary stays with the wallet owner through Reown AppKit and Wagmi.

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
app/api/robinhood/trade/route.ts     Hobin quote preparation and no-pair/no-liquidity reporting
app/api/stocks/chart/route.ts        Yahoo Chart OHLC data for chart ranges
```

## Key Modules

```text
lib/robinhood.ts              Official stock/payment token dictionary, RPC status, DEX quote boundary
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
