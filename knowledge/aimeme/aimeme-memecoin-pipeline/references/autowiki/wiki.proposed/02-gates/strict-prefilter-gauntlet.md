---
id: 24
category: gates
function: Apply Strict Prefilters
status: proposed
version: 4.0
related: [12, 22, 23, 35, 42, 43]
---
# Strict Prefilters — Web-Consensus Threshold Tilt

Pipeline v3.9 lacks explicit numeric gates on market cap range, liquidity floor, holder count, and active SM count. As a result, scoring runs on tokens that web consensus would reject before a single API call. Net effect: the scoring stage processes noise that should never reach it, wasting agentcash budget and surfacing false positives like Dunald (0 SM) and HENRY (single-holder concentration outlier) in earlier cycles.

The proposed prefilter set is a hard AND-gate applied immediately after discovery, before scoring. Where source frameworks conflict, the stricter number wins. Tokens failing any one gate are rejected with one log line, no score computed.

## The Gates

- Chain whitelist: `sol`, `eth`, `base`, `arb`. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]].
- Market cap band: $100,000 to $2,000,000. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]]; Supports [[raw/nansen-2026-token-framework.md]] memecoin liquidity-floor logic and [[raw/photon-bullx-gmgn-filter-settings.md]] $9k snipe floor (we sit above the snipe band, in the early-conviction window).
- Age band: 6 hours to 14 days. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]]; Extends [[raw/photon-bullx-gmgn-filter-settings.md]] "Degen 0–72h" window past the snipe noise zone.
- Liquidity floor: $50,000 pooled. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]]. Contradicts [[raw/nansen-2026-token-framework.md]] $100k memecoin floor — v4.0 deliberately sits below Nansen because the $100k–$2M mcap band starts populating with structural passes only above $50k liquidity, and pairing the stricter Nansen floor with the SM ≥ 3 gate produces a 0-pass cycle.
- LP locked or burned ≥ 80 percent — interpreted via tri-state. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]]; Extends [[lp-locked-tristate.md]]; Refutes a binary `lpLockedPct == 0 → reject` reading per [[raw/pump-fun-graduation-mechanics.md]].
- Top-10 holder cap: ≤ 30 percent. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]] and [[raw/photon-bullx-gmgn-filter-settings.md]]. Contradicts [[raw/nansen-2026-token-framework.md]] 40 percent ceiling; stricter-wins applies.
- Single non-CEX/LP holder cap: ≤ 15 percent. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]].
- Holder count floor: ≥ 500. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]].
- Active Nansen SM (30D/90D/180D Smart Trader + Fund) ≥ 3 — mandatory, not soft-weighted. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]]; Implements [[sm-conviction-floor]]; Supports [[raw/nansen-2026-token-framework.md]] coordinated-conviction signal (10 SM in 48h, here softened to ≥3 active for the early band).
- Volume-to-mcap 24h: 0.1x to 5x. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]]; Extends [[raw/nansen-2026-token-framework.md]] healthy 10–30 percent band into a wider operating range that includes early-discovery spikes.
- Bundle concentration: < 15 percent. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]]; Contradicts [[raw/photon-bullx-gmgn-filter-settings.md]] stricter < 10 percent — v4.0 widens to 15 percent because terminal data on bundle attribution is noisier off-platform.

## Empirical Calibration

- Cycle-4 live validation: ~40 trending Solana pools, 1 token (HENRY) passes — 2.5 percent pass rate. DerivedFrom [[raw/cycle-4-scan-results-2026-04-28.md]] and [[raw/v4-0-strict-prefilter-thresholds.md]].
- The mandatory-SM gate is the rate-limiting filter; structural gates alone leak too much. DerivedFrom [[raw/v4-0-strict-prefilter-thresholds.md]]; Supports [[sm-conviction-floor]].

## Cross-Links

- Implements ordering principle from [[cheap-gate-ordering.md]] — structural gates (free) run before SM gate (paid).
- Implements [[monotonic-netflow-score]] — the volume-to-mcap 0.1x–5x gate is the prefilter-stage complement to the netflow ladder; both screen velocity authenticity.
- Implements [[top-holder-dumping]] — the top-10 30% gate is the static prefilter version of the step-3.5 dumping detector.
- Extends [[sm-conviction-floor]] from a scoring component into a hard prefilter gate.
- Extends [[wash-vs-real-velocity]] — the vol/mcap band targets the same wash-vs-real question on a different endpoint.
- DerivedFrom [[raw/henry-dunald-tromp-token-series.md]] entries, which were entered as paper experiments to validate v4.0 against outcome data.

<!-- sources:
- raw/v4-0-strict-prefilter-thresholds.md sha256:c9d35471a573520a6adfe667e0025a274d5781965594fe7c1b12dbcb0471d4e4
- raw/nansen-2026-token-framework.md sha256:be7f91beb39e52ddaf7b3c420b23d7f56e84bfa018c003f719e391953dbb9dd2
- raw/photon-bullx-gmgn-filter-settings.md sha256:bb41476f0e59e55abc220ee09c0cfc15100cd81e9c5925e147c3b58944b7f825
- raw/pump-fun-graduation-mechanics.md sha256:2900765cf120f00ded8aed5b556fed1360114db4317ea1d76360705b3b0b5079
- raw/cycle-4-scan-results-2026-04-28.md sha256:40e6f008a45709b720e2d0604601a11c49ea6a86a7b4a560acb99980071ac74a
- raw/henry-dunald-tromp-token-series.md sha256:5caeac80043b56308bc4765e4a88c79ce69bccabd29f1bc18a1c9113c79ce801
-->
