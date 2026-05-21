# Agent Instructions

This repository is the Hermes Robinhood Chain serverless deployment, not the upstream Hermes Agent codebase.

## Scope

Keep the repo lean and deployment-focused. The live surfaces are:

- `app/page.tsx` for the browser command center.
- `app/api/` for runtime, stock-token, market-intel, and quote-preparation routes.
- `lib/` for Robinhood Chain, Nuvolari, Kalshi, calendar, env, and HTTP helpers.
- `vercel.json`, `.env.example`, `README.md`, and `package.json` for deployment metadata.

Do not reintroduce the upstream Hermes CLI, gateway, TUI, skills tree, cron trading workflows, tests, docs site, release notes, installers, Nix files, or package lockfiles unless the user explicitly asks for that full product again.

## Development Rules

- Keep secrets out of the repo. Add secret names to `.env.example`, not real values.
- Preserve the wallet boundary: quote preparation is allowed, signing is never done by the agent.
- If adding Nuvolari API paths, prefer explicit env overrides and keep request payloads in `lib/robinhood.ts` traceable.

## Verification

Before finishing changes, run:

```bash
npm run build
git status --short
```

For endpoint behavior, test through the Next.js routes locally or deploy to Vercel.
