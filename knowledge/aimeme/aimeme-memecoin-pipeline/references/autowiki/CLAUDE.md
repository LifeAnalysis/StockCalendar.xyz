# Project scope: vendored AImeme AutoWiki

You are operating inside the vendored `skills/blockchain/aimeme-memecoin-pipeline/references/autowiki/` tree. This is a self-contained knowledge base for the AImeme memecoin pipeline.

## Hard scope

- **Read/write inside this vendored `references/autowiki/` tree only.**
- **Read-only access to parent vendored references** — specifically `../pipeline.md`, `../onepager.md`, `../buy-workflow.md`, and copied code references. These are first-class sources for understanding trades. AutoWiki never writes back to them.
- **Never touch:** home-directory agent config, Desktop folders, or files outside the deployed Hermes repo.
- **No memory writes outside this folder.** Persistent state = `wiki/`, `wiki.proposed/`, `outputs/`.
- **No network/MCP calls** unless user explicitly asks. Flat-file system.

## Parent-folder integration

Treat parent files as canonical raw sources without copying them:
- `../pipeline.md` — pipeline v3.9 spec (gates, score, SM-exit rule)
- `../portfolio.md` — paper portfolio, active positions, timelines, rejected lessons
- `../onepager.md` — strategy overview
- `../index.md` — memory index

When citing in `wiki/`, use `[[../pipeline.md]]`, `[[../portfolio.md]]`, etc. Hash them for R6 staleness like any other source.

The point: `wiki/` builds durable concepts (e.g. `sm-exit-pattern.md`, `livo-launchpad-backdoor.md`, `lp-locked-tristate.md`) that synthesize lessons across many trades, with verb-labeled links connecting pipeline rules → trade outcomes → rejected token patterns.

## Operating manual

Full rules in `config/CLAUDE.md`. Read it before any action. R1–R7 govern everything.

## Default on entry

1. Read `config/CLAUDE.md`
2. Read `README.md`
3. Wait for user instruction. Do not auto-reweave.
