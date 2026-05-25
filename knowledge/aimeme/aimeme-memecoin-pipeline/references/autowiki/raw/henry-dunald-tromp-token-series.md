> WHY: Documents the seedling-emoji Token2022 series (HENRY and Dunald Tromp) entered as paper experiments on 2026-04-28 to validate v4.0 strict-tilt thresholds against live outcome data; both tokens share enough structural fingerprints to warrant treatment as a coordinated series.

# Seedling-Emoji Token2022 Series — HENRY and Dunald Tromp

## Tokens

- **HENRY**: contract `CJUrENDAuSm4FxxziUgftnUJqqXjm4VL1zhJgwXupump`.
- **Dunald Tromp**: contract `3hPjuKcU2Bs2hGnwrkNnYFnmkUbJNsaPpM6MzRH7pump`.

## Shared Fingerprints

Both tokens exhibit the following overlapping characteristics, suggesting coordinated authorship or shared template:

- **Token program**: Token2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`) — not the legacy SPL token program. Token2022 enables transfer hooks and metadata extensions and is the 2026 default for newer pump.fun launches.
- **LP locked**: both above 94 percent.
- **Branding**: both use a seedling emoji prefix in the ticker/name.
- **Marketing site**: both use `.fun`-themed brand domains. Dunald Tromp resolves to `dunaldtromp.fun`.

The fingerprint overlap (program + LP-lock band + emoji convention + domain convention) is too tight to be coincidence — treat as a series until proven otherwise.

## Per-Token State at Entry — 2026-04-28

### HENRY

- Price: -84 percent over h24.
- Smart money: 3 active SM accumulating. One is a fresh 90-day Smart Trader buyer with +$5,200 inflow.
- Verdict: passes v4.0 strict — sole pass of cycle 4. See [[cycle-4-scan-results-2026-04-28.md]].

### Dunald Tromp

- Smart money: 0 active SM.
- 7-day flow: slight seller skew.
- Verdict: fails v4.0 SM gate (mandatory ≥3). Entered as paper position on strict-tilt experiment basis only — explicit lower-conviction comparison leg against HENRY.

## Experimental Purpose

Both positions are paper-only and sized for outcome calibration, not conviction trades. Goal: collect price/SM-flow trajectories that validate or refute the v4.0 strict prefilter — specifically whether the "mandatory SM ≥3" gate produces meaningfully better outcomes than the looser "any structural pass" baseline that Dunald Tromp represents.

## Sources

- Internal paper-portfolio entry log, 2026-04-28
- DerivedFrom [[v4-0-strict-prefilter-thresholds.md]] and [[cycle-4-scan-results-2026-04-28.md]]
- On-chain: Solana mainnet contract addresses above
