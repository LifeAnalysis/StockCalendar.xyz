---
id: 33
category: patterns
function: Recognize Token2022 Emoji-Series
status: proposed
related: [24, 12, 31]
---
# Token2022 Emoji-Series Launch Pattern

A recurring launcher fingerprint observed on pump.fun launches in 2026: a coordinated series of tokens sharing token program, LP-lock band, ticker convention, and brand-domain convention. When the fingerprint overlap is tight enough, treat the tokens as a single coordinated series until proven otherwise — pricing them independently misreads correlated tail risk.

## The HENRY / Dunald Tromp Specimen

Two tokens entered as paper experiments on 2026-04-28 share the following overlapping characteristics:

- Token program: Token2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`), not legacy SPL. Token2022 enables transfer hooks and metadata extensions and is the 2026 default for newer pump.fun launches. DerivedFrom [[raw/henry-dunald-tromp-token-series.md]].
- LP locked: both > 94 percent. DerivedFrom [[raw/henry-dunald-tromp-token-series.md]].
- Branding: both use a seedling-emoji prefix in ticker/name. DerivedFrom [[raw/henry-dunald-tromp-token-series.md]].
- Marketing domain: both use a `.fun`-themed brand domain (e.g. `dunaldtromp.fun`). DerivedFrom [[raw/henry-dunald-tromp-token-series.md]].

## Why Treat as Series

The fingerprint overlap (program + LP-lock band + emoji convention + domain convention) is too tight to be coincidence. Coordinated authorship implies:

- Outcome correlation: if one token in the series rugs or distributes, the series-level prior on the rest must update sharply. DerivedFrom [[raw/henry-dunald-tromp-token-series.md]].
- Sizing implication: independent position sizing across the series double-counts the same bet. Treat the series as a single position with combined exposure cap.

## Validation Path

Both positions were paper-only and sized for outcome calibration, not conviction. Goal: collect price/SM-flow trajectories that validate or refute the v4.0 strict prefilter — specifically whether the mandatory SM ≥ 3 gate produces meaningfully better outcomes than the looser "any structural pass" baseline that Dunald Tromp represents.

- Implements experimental design from [[strict-prefilter-gauntlet]] — HENRY (passes SM gate) vs Dunald Tromp (fails SM gate) as comparison legs.
- Supports [[sm-conviction-floor]] — Dunald is the explicit lower-conviction control against HENRY's SM-validated entry.
- DerivedFrom [[raw/cycle-4-scan-results-2026-04-28.md]] for the broader trending-feed context in which both were surfaced.

## Pattern Generalization

The durable concept beyond this specific pair: when a memecoin appears, fingerprint its launcher signature (token program, LP-lock band, naming convention, domain pattern) and search the recent trending feed for siblings. A lone candidate is one bet; a series is a portfolio of correlated bets disguised as independent.

<!-- sources:
- raw/henry-dunald-tromp-token-series.md sha256:5caeac80043b56308bc4765e4a88c79ce69bccabd29f1bc18a1c9113c79ce801
- raw/cycle-4-scan-results-2026-04-28.md sha256:40e6f008a45709b720e2d0604601a11c49ea6a86a7b4a560acb99980071ac74a
-->
