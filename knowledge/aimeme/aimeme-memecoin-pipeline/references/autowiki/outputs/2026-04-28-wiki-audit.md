# Wiki Lint + Consolidation Audit — 2026-04-28

Scope: 12 wiki pages (incl. index), 7 wiki.proposed pages, raw context. Rule basis: R3 verb-labeled backlinks, R4 output separation.

## 1. Missing cross-links

| Source page | Target page | Suggested link | Why |
|---|---|---|---|
| sm-conviction-recency.md | sm-conviction-floor.md | `Extends [[sm-conviction-floor]]` | Recency is the second-order question once SM presence is established; the prior page explicitly extends *to* recency but not back. |
| sm-exit-pattern.md | sm-conviction-floor.md | `Supports [[sm-conviction-floor]]` | Exit-dominated SM is the dynamic version of the zero-SM rule; the FROGE/EMPLOYEE pair are the same lesson. |
| sm-exit-pattern.md | aggregate-vs-instantaneous-meta-rule.md | `DerivedFrom [[aggregate-vs-instantaneous-meta-rule.md]]` | The page describes itself as defusing a lifetime aggregate, but never names the meta-rule. |
| sm-exit-pattern.md | top-holder-dumping.md | `Supports [[top-holder-dumping.md]]` | Both detect distribution into a flattering aggregate; sibling instantiations. |
| wash-vs-real-velocity.md | monotonic-netflow-score.md | `Supports [[monotonic-netflow-score.md]]` | m5 unique buyers and 15m netflow positivity are the same "is the most recent window real" question on adjacent endpoints. |
| monotonic-netflow-score.md | wash-vs-real-velocity.md | `Supports [[wash-vs-real-velocity.md]]` | Reciprocal of above. |
| top-holder-dumping.md | lp-locked-tristate.md | `Supports [[lp-locked-tristate.md]]` | Both are step-3/5 cheap structural gates that can hard-kill before the paid SM call. |
| top-holder-dumping.md | cheap-gate-ordering.md | `Implements [[cheap-gate-ordering.md]]` | Step 3.5 runs on the free `/holders` endpoint — the canonical free-tier cheap gate. |
| top-holder-dumping.md | drained-pool-honeypot.md | `Supports [[drained-pool-honeypot.md]]` | NYANDOG (94.48% top10 + drained) is referenced by both pages; the honeypot page already crosslinks back. |
| lp-locked-tristate.md | cheap-gate-ordering.md | `Implements [[cheap-gate-ordering.md]]` | Rugcheck LP read is free and runs before Nansen — the canonical example in cheap-gate-ordering already cites it. |
| lp-locked-tristate.md | pump-fun-lp-zero-default.md | `Extends [[../wiki.proposed/pump-fun-lp-zero-default.md]]` | The proposed page extends tristate to the Solana pump.fun case; reciprocal link. |
| position-sizing-tiers.md | sm-conviction-floor.md | `DerivedFrom [[sm-conviction-floor]]` | S-tier promotion gate is "convicted SM ≥3 OR SM>10% pool" — the SM-non-negotiable rule is the foundation. |
| position-sizing-tiers.md | sm-exit-pattern.md | `Implements [[sm-exit-pattern.md]]` | "Top SM full exit" is listed as a uniform hard-exit trigger. |
| position-sizing-tiers.md | lp-locked-tristate.md | `Supports [[lp-locked-tristate.md]]` | D-tier explicitly conditions on "LP locked" — tristate scoring decides eligibility. |
| cheap-gate-ordering.md | sm-conviction-floor.md | `Supports [[sm-conviction-floor]]` | FROGE story is shared verbatim — the SM page is the conclusion, this page is the cost-ordering preamble. |
| cheap-gate-ordering.md | drained-pool-honeypot.md | `Supports [[drained-pool-honeypot.md]]` | NYANDOG is the cheap-gate canonical reject and the drained-pool canonical instance simultaneously. |
| strict-prefilter-gauntlet.md (proposed) | monotonic-netflow-score.md | `Supports [[monotonic-netflow-score.md]]` | Volume-to-mcap 0.1x–5x gate complements the netflow ladder; both screen velocity authenticity. |
| strict-prefilter-gauntlet.md (proposed) | top-holder-dumping.md | `Supports [[top-holder-dumping.md]]` | Top-10 30% gate is the static prefilter version of the dumping detector. |
| strict-prefilter-gauntlet.md (proposed) | wash-vs-real-velocity.md | `Supports [[wash-vs-real-velocity.md]]` | Vol/mcap band targets the same wash-vs-real question. |
| dashboard-numbers-audit-lessons.md | drained-pool-honeypot.md | `Implements [[drained-pool-honeypot.md]]` | Already references the file inline ("see drained-pool-honeypot.md") but without a verb-labeled R3 link in a Claims section. |

## 2. Deletion candidates

- **dashboard-numbers-audit-lessons.md** — R4 violation candidate. Reads as a dated post-mortem of three specific bugs ("Bugs found and fixed on 2026-04-28"), not stable knowledge. The durable lessons it carries (regex anchoring, "one result" endpoints lie, drained pools pollute) belong in `dexscreener-pair-selection.md` and `drained-pool-honeypot.md`, both of which already cover them. Recommendation: relocate to `outputs/2026-04-28-dashboard-audit.md` and delete from wiki.
- **v4-experimental-entries-2026-04-28.md** — R4 borderline. Dated, position-specific, narrative — closer to a trade journal entry than a concept. The general lesson (sub-threshold experimental entries with -30% override) is durable but the per-token detail is not. Partial-deletion: keep a slim `experimental-entry-protocol.md` concept, move the HENRY/Dunald specifics to outputs.
- All other 10 wiki pages are load-bearing. No further deletions.

## 3. Aggregation / merge candidates

- **smart-money-signal-discipline (hub)** — sources: `sm-conviction-floor.md` + `sm-conviction-recency.md` + `sm-exit-pattern.md`. Verdict: **KEEP SEPARATE**. Each carries a distinct rule with its own canonical evidence (FROGE / ROO / LEVR-EMPLOYEE-MAGA respectively). Merging flattens three sharp gates into one fuzzy "SM section" and erodes citation provenance. Strengthen with the cross-links in section 1 instead.
- **netflow-velocity-authenticity** — sources: `wash-vs-real-velocity.md` + `monotonic-netflow-score.md`. Verdict: **KEEP SEPARATE**. They operate on different endpoints (m5 unique buyers vs nested netflow windows) and different pipeline steps (1.5 vs 5.5). Add reciprocal `Supports` links per section 1.
- **structural-prefilter-ordering** — sources: `lp-locked-tristate.md` + `cheap-gate-ordering.md`. Verdict: **KEEP SEPARATE**. LP-locked is a *signal*, cheap-gate-ordering is a *meta-rule about signal sequencing*. Different abstraction levels; merging would conflate "what to check" with "when to check it".
- **top-holder-dumping ⊂ aggregate-vs-instantaneous-meta-rule** — Verdict: **PARTIAL**. Top-holder-dumping is genuinely an instance of the meta-rule (the meta-rule page already lists it among the six instantiations). But it carries a distinct step-3.5 numeric threshold and a distinct evidence set. Keep separate; ensure the meta-rule page lists all six instantiations with verb-links (it does) and that each instantiation page reciprocally cites `DerivedFrom [[aggregate-vs-instantaneous-meta-rule.md]]` (sm-exit-pattern.md is missing this — see section 1).

## Final summary

- Total wiki pages reviewed: 12 wiki + 7 wiki.proposed = 19
- Cross-link suggestions: 20
- Deletion candidates: 2 (1 strong R4 violation, 1 partial)
- Merge candidates: 0 full merges, 1 partial reinforcement
- Recommended next action: dry-run a reweave that adds the 20 cross-links and migrates `dashboard-numbers-audit-lessons.md` to `outputs/`; defer experimental-entries split until after HENRY/Dunald close.
