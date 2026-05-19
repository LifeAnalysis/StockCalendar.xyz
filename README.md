# Nuvolari Hermes Agent

Compact Vercel/OpenRouter agent for Nuvolari execution research and AImeme memecoin scouting.

This repo is intentionally small. It keeps only the serverless API, browser command center, AImeme knowledge base, cron workflow, and deployment config needed for Gary's autonomous trading research stack.

## What It Does

- Routes chat requests through OpenRouter with tool calls handled in `api/index.py`.
- Calls Nuvolari read/quote endpoints for yields, swaps, buys, execution quotes, and signed execution submission.
- Runs AImeme discovery across GeckoTerminal/CoinGecko, DexScreener, Rugcheck, and GoPlus.
- Generates AgentCash/Nansen paid-enrichment commands without spending x402 funds from Vercel.
- Exposes `/api/cron/aimeme` for compact scheduled decisions and optional webhook delivery.
- Serves a simple browser command center from `public/index.html`.

The agent does not sign transactions. Final swaps, buys, yield entries, or execution submissions still require exact token/vault addresses, numeric chain IDs, wallet EOA, integer base-unit amounts, and user-produced signatures.

## Repo Layout

```text
api/index.py                         Serverless API and tool-call runtime
public/index.html                    Browser command center
knowledge/aimeme/                    AImeme doctrine, workflow, and AutoWiki references
.github/workflows/hermes-cron.yml    15-minute AImeme cron caller
vercel.json                          Vercel routing
.env.example                         Required deployment variables
```

## Environment

Copy `.env.example` into Vercel project env vars or a local `.env` when testing.

```bash
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_MAX_TOKENS=8192
OPENROUTER_HISTORY_TURNS=24
OPENROUTER_TRANSFORMS=middle-out

NUVOLARI_API_BASE_URL=https://api.staging.nuvolari.ai
NUVOLARI_API_KEY=...
NUVOLARI_SECRET_API_KEY=...

COINGECKO_API_KEY=
AIMEME_TRACKED_TOKENS='[{"symbol":"TOKEN","chain":"base","address":"0x...","entry_price":"0.001"}]'
AIMEME_DECISION_WEBHOOK_URL=
AIMEME_CRON_SECRET=
```

## API

- `GET /` serves the command center.
- `GET /api/health` reports configured keys, Nuvolari path readiness, model, and AImeme knowledge status.
- `POST /api/chat` sends a user message through OpenRouter and executes approved local tools.
- `GET /api/cron/aimeme?max_candidates=6&chain=base` runs a compact AImeme scan cycle.
- `GET /api/context7?q=...` fetches Nuvolari Context7 docs text.
- `GET /api/docs/<topic>?ask=...` proxies Nuvolari docs lookup topics such as `swap`, `yield`, `liquidity`, `agents`, and `insights`.

## Cron

GitHub Actions calls `/api/cron/aimeme` every 15 minutes. Set `HERMES_AGENT_BASE_URL` as a repository variable or secret, for example:

```text
https://your-vercel-app.vercel.app
```

If `AIMEME_CRON_SECRET` is set in Vercel, add the same value as a GitHub Actions secret so the workflow can send `Authorization: Bearer ...`.

## Deployment

Deploy this repo to Vercel with the default project root. `vercel.json` routes `/api/*` to `api/index.py` and all other requests to `public/index.html`.

No Node install is required. The Python function uses the standard library only.
