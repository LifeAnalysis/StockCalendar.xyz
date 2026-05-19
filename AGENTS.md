# Agent Instructions

This repository is the Nuvolari Hermes serverless deployment, not the upstream Hermes Agent codebase.

## Scope

Keep the repo lean and deployment-focused. The live surfaces are:

- `api/index.py` for the Vercel Python function and all agent tools.
- `public/index.html` for the browser command center.
- `knowledge/aimeme/` for AImeme workflow, doctrine, and AutoWiki references.
- `.github/workflows/hermes-cron.yml` for the 15-minute AImeme scheduler.
- `vercel.json`, `.env.example`, `README.md`, and `package.json` for deployment metadata.

Do not reintroduce the upstream Hermes CLI, gateway, TUI, skills tree, tests, docs site, release notes, installers, Nix files, or package lockfiles unless the user explicitly asks for that full product again.

## Development Rules

- Prefer simple standard-library Python in `api/index.py`; Vercel should not need dependency installation.
- Keep secrets out of the repo. Add secret names to `.env.example`, not real values.
- Keep AImeme reference content under `knowledge/aimeme/`.
- Keep cron payloads compact. `/api/cron/aimeme` should return decisions, not raw provider payload dumps.
- Preserve the wallet boundary: quote preparation is allowed, signing is never done by the agent.
- If adding Nuvolari API paths, use env overrides like `NUVOLARI_YIELD_PATH` or update `NUVOLARI_DEFAULT_PATHS` in `api/index.py`.

## Verification

Before finishing changes, run:

```bash
python -m py_compile api/index.py
git status --short
```

For endpoint behavior, deploy to Vercel or test through a local BaseHTTPRequestHandler wrapper if one is added later.
