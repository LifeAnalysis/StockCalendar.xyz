---
id: 45
category: meta
function: Spray Sizing Discipline
status: proposed
related: [13, 14, 40, 42, 44]
---

# Spray Sizing Discipline

## Rule

Manual "spray and pray" entries are allowed only as explicitly labeled D-tier paper experiments when the strict pipeline has not produced a BUY signal. The entry must cite which workflow evidence supports the spray, which required BUY evidence is missing, and the exact condition required before any size-up. Implements [[position-sizing-tiers]]. DerivedFrom [[../pipeline.md]]. Supports [[../portfolio.md]].

## Why

Cycle 10 produced zero strict BUY signals, but the user requested small exposure to the best available candidates. bENAT was the cleanest non-hard-kill survivor but lacked enough SM dollar conviction relative to pool depth and had unknown UniV4 LP lock. KIMCHI had a live dashboard market trigger but still needed full GoPlus and Nansen SM re-vet. Both were therefore entered as $50 D-tier spray positions instead of being mislabeled as pipeline BUYs. DerivedFrom [[../outputs/2026-05-04-cycle-10-pipeline-run.md]]. Supports [[../outputs/2026-05-04-spray-entries-and-llm-context.md]].

## Non-Negotiables

Spray mode does not override hard kills. Tokens rejected for honeypot, creator-in-top10, unlocked young LP, drained pool, proxy/backdoor, bundle, or SM-exit distribution remain zero-size. SUEAAUAN stayed watch-for-learning only because Rugcheck showed creator ownership in a top-10 Solana token account, even though its surface velocity and LP-lock looked attractive. Implements [[creator-in-top10-solana-rugcheck]]. Supports [[../pipeline.md]].

## Logging Requirement

Every spray entry must add an active position row, an active token timeline row, and an autowiki output note that distinguishes strict BUY from discretionary spray. This preserves clean outcome labels for future regression: strict pipeline signals should not be mixed with manual low-conviction experiments. Implements [[dashboard-numbers-audit-lessons]]. Supports [[../portfolio.md]].

<!-- sources:
- ../pipeline.md
- ../portfolio.md
- ../outputs/2026-05-04-cycle-10-pipeline-run.md
- ../outputs/2026-05-04-spray-entries-and-llm-context.md
-->
