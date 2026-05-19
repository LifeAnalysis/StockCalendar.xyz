# Contradictions — 2026-04-28 Reweave

## C1 — Memecoin Liquidity Floor

- **Nansen 2026 framework**: minimum $100,000 pooled liquidity for memecoin viability.
  - Source: `raw/nansen-2026-token-framework.md` (Liquidity section).
- **v4.0 strict prefilter**: liquidity floor $50,000.
  - Source: `raw/v4-0-strict-prefilter-thresholds.md` (Gate Definition).
- **Status**: Acknowledged divergence. v4.0 sits below the Nansen recommendation deliberately, otherwise the $100k–$500k mcap band returns zero passes when intersected with the SM ≥ 3 gate. Flagged as technical debt in `wiki.proposed/02-gates/strict-prefilter-gauntlet.md` and `wiki.proposed/04-meta/nansen-mcap-liquidity-thresholds.md`.

## C2 — Top-10 Holder Ceiling

- **Nansen 2026 framework**: ≤ 40 percent of supply is healthy.
  - Source: `raw/nansen-2026-token-framework.md` (Holder Distribution).
- **Photon/BullX/GMGN/Axiom consensus**: ≤ 30 percent.
  - Source: `raw/photon-bullx-gmgn-filter-settings.md` (Holder Distribution).
- **v4.0 strict prefilter**: ≤ 30 percent.
  - Source: `raw/v4-0-strict-prefilter-thresholds.md`.
- **Status**: Stricter-wins applied; pipeline uses 30 percent. Documented in proposals.

## C3 — Bundle Concentration Cap

- **Photon/BullX/GMGN/Axiom consensus**: < 10 percent.
  - Source: `raw/photon-bullx-gmgn-filter-settings.md` (Holder Distribution).
- **v4.0 strict prefilter**: < 15 percent.
  - Source: `raw/v4-0-strict-prefilter-thresholds.md`.
- **Status**: v4.0 deliberately looser because off-platform bundle attribution is noisier than on-terminal. Acknowledged in `wiki.proposed/02-gates/strict-prefilter-gauntlet.md`.

## C4 — Volume-to-Mcap Band

- **Nansen 2026 framework**: healthy band 10–30 percent (above 30 percent: wash/insider distribution).
  - Source: `raw/nansen-2026-token-framework.md` (Volume).
- **v4.0 strict prefilter**: 0.1x to 5x daily (i.e. 10 percent to 500 percent).
  - Source: `raw/v4-0-strict-prefilter-thresholds.md`.
- **Status**: v4.0 widens the upper bound substantially to admit early-discovery spikes. The wider band must be paired with a wash-vs-real velocity check (see `wiki/wash-vs-real-velocity.md`) — otherwise we admit wash activity Nansen's framework would correctly reject. Flagged for review.

## No contradictions found between raw files and existing `wiki/*.md` synthesis pages — only between raw sources themselves and between raw sources and the proposed v4.0 spec.
