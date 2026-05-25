---
name: Spray Entries and LLM Context Update
description: Paper entry actions after Cycle 10 and the documentation changes needed for future LLM runs.
type: project
date: 2026-05-04T16:05+07:00
---

# 2026-05-04 Spray Entries and LLM Context

## Actions

Cycle 10 strict workflow produced zero BUY signals. After user instruction to "spray and pray" the best candidates, the paper portfolio opened two capped D-tier experimental entries:

| Token | Chain | Address | Entry | Size | Tokens | Stop | TP | Classification |
|---|---|---|---:|---:|---:|---:|---:|---|
| bENAT | eth | `0x56d06158bb8d2e42a6c5994a9a12a5c6d642f064` | $0.8975 | $50 | 55.71 | $0.763 | $1.256 | Best non-hard-kill cycle-10 survivor |
| KIMCHI | eth | `0x2b566950ba2298acef3c730cc0129b2f4fbd30a3` | $0.0000009640 | $50 | 51,867,220 | $0.000000819 | $0.000001350 | Market-trigger D-tier re-vet/spec |

These are not clean v3.9 BUY signals. They are deliberately capped spray entries under the v4.0 tiering philosophy that score becomes size. BENAT has real workflow support but thin SM dollar conviction; KIMCHI has live market support but still needs full safety/SM re-vet before any size-up.

## Linked Source Trail

- Portfolio entries and token timelines: `[[../portfolio.md]]`
- Canonical hard gates and score model: `[[../pipeline.md]]`
- Cycle 10 strict workflow report: `[[outputs/2026-05-04-cycle-10-pipeline-run.md]]`
- Solana creator-owner hard kill staged from SUEAAUAN: `[[wiki.proposed/02-gates/creator-in-top10-solana-rugcheck.md]]`
- Spray sizing discipline staged from this action: `[[wiki.proposed/04-meta/spray-sizing-discipline.md]]`

## Findings

1. A strict Nansen holdings pass can correctly output zero BUY signals while still producing useful ranked watch candidates.
2. If user requests a discretionary spray, the portfolio must label it as an experiment, cap it at D-tier, and preserve the difference between "workflow BUY" and "manual spray".
3. Hard kills are still binary during spray mode. SUEAAUAN stayed out because Rugcheck exposed creator ownership in a top-10 Solana token account.
4. `/llms-full.txt` needed broader context: root docs alone were insufficient because the most recent lessons lived in autowiki outputs and wiki proposals.
