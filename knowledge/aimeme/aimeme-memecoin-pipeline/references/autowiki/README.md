# aimeme/autowiki

File-over-app knowledge base for the memecoin pipeline. Karpathy-style, no vector DB.

Reads parent `../pipeline.md`, `../portfolio.md`, `../onepager.md`, `../index.md` as first-class sources (read-only). Synthesizes durable concepts (SM-exit patterns, launchpad backdoors, LP-locked tri-state, etc.) in `wiki/`.

## Layout

- `raw/` — curated source material. Human-only writes. Each file starts with `> WHY: ...`.
- `wiki/` — synthesized notes with cited claims and labeled backlinks.
- `wiki.proposed/` — staging for agent edits. Promoted by `scripts/merge.sh`.
- `outputs/` — ephemeral reports and Q&A. Dated `YYYY-MM-DD-slug.md`.
- `config/CLAUDE.md` — agent operating manual. Do not edit casually.
- `scripts/` — `ingest.sh`, `reweave.sh`, `merge.sh`.

## Workflow

1. **Add source:** `scripts/ingest.sh path/to/article.md "why this matters"` → drops in `raw/` with WHY header + sha.
2. **Reweave:** open Claude Code in this dir, ask it to run the reweave protocol per `config/CLAUDE.md`. Agent stages proposals in `wiki.proposed/`.
3. **Review:** `scripts/merge.sh` shows diff. `scripts/merge.sh --apply` promotes all.
4. **Ask questions:** agent writes answers to `outputs/`, never to `wiki/`.

## Guardrails (the trap-killers)

- WHY-line gate at intake (R1)
- Mandatory `[[raw/...]]` citations on every claim (R2)
- Verb-labeled backlinks: `Implements`, `Contradicts`, `DerivedFrom`, etc. (R3)
- Outputs strictly separated from wiki (R4)
- All agent edits dry-run via `wiki.proposed/` (R5)
- sha256 source-hash footers — staleness detection (R6)
- No autonomous deletion (R7)

No cron. Reweave is manual.
