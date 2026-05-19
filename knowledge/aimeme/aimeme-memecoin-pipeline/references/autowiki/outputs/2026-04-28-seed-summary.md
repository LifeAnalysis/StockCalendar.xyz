# Autowiki Seed Summary — 2026-04-28

Initial seed of `wiki.proposed/` from parent aimeme history (`pipeline.md`, `portfolio.md`, `onepager.md`, `index.md`). All writes are dry-run per R5; user must run `scripts/merge.sh --apply` to promote into `wiki/`.

## Files created in `wiki.proposed/` (10)

- `sm-exit-pattern.md` — distribution detection rule (step 5.6); LEVR/EMPLOYEE/MAGA validated cases; why `trader_count` lifetime is misleading.
- `lp-locked-tristate.md` — locked / unknown / unlocked tri-state; UniV4 false-negative fix that unblocks uPEG.
- `aggregate-vs-instantaneous-meta-rule.md` — v3.9 organizing principle; six instantiations across the pipeline.
- `livo-launchpad-backdoor.md` — ARMA / NICE / EMPLOYEE-style template; permanent unlimited allowance pattern.
- `top-holder-dumping.md` — step 3.5 rule on top-10 24h balance change; why aggregate trending hides distribution.
- `wash-vs-real-velocity.md` — step 1.5 m5 unique-buyer confirmation that disambiguates Solana pumps from bot residue.
- `monotonic-netflow-score.md` — graduated 1.0 / 0.6 / 0.3 / 0.0 ladder over 6h/1h/15m windows.
- `sm-conviction-recency.md` — convicted (>7d) +0.3 bonus vs recent-only (≤2d) -0.3 FOMO penalty in step 4b.
- `position-sizing-tiers.md` — full S/A/B/C/D table from portfolio.md v4.0 sizing.
- `paper-portfolio-active.md` — current snapshot of uPEG and ROO open positions with latest-cycle P&L.

## Source hashes (R6 footers)

- `../pipeline.md` sha256: `1cc4df05330ada2e3d3144737ed904145b0be76927f6d7ab8696b80be59ccc17`
- `../portfolio.md` sha256: `0e801844cff851c649b9f840c278951f9533100f9270feb5037acdca61888691`
- `../onepager.md` sha256: `ba1406fa670f91b11aa098665076efb1a7c00cedd45d05695abdf47377517379`
- `../index.md` sha256: `d3464ed911395d57239c15605227f0df2d1a834fd45475a81647a187cc10ef3a`

## Contradictions found between sources

1. **uPEG / ROO P&L numbers diverge between onepager and portfolio.** `onepager.md` reports uPEG @ -9% and ROO @ -5% (total -$17 / -7.5%). `portfolio.md` latest cycle shows uPEG @ -12.77% and ROO @ -6.5%. Treated `portfolio.md` as canonical (multi-cycle granular log) and noted in `paper-portfolio-active.md`. Onepager appears to reflect an earlier cycle's snapshot.

2. **Document version drift in pipeline.md header.** Title declares "Memecoin Pipeline v3.8 (canonical)" while frontmatter `name` and section content describe v3.9. Not a factual contradiction — header just hasn't been retitled — but worth flagging for the next reweave.

3. **Score 3.0/4 promoted to A-tier $150 for uPEG.** `portfolio.md` Active Positions row says "3.0/4 → re-tier A". The position-sizing tier table requires 4/4 for A-tier baseline; the re-tier is justified inline by convicted-SM concentration (41% of pool, S-tier-eligible bonus). This is a documented override rather than a contradiction, but the tier table itself doesn't formally cover "3.0/4 + S-tier qualifier → A-tier" as a path. Worth codifying in a future tier-promotion-rule wiki entry.

## Notes

- All citations use `[[../pipeline.md]]`-style parent links per `autowiki/CLAUDE.md` parent-folder integration policy. Verb labels per R3 applied throughout.
- No files written to `wiki/` directly. No deletions. No edits to parent aimeme/ files.
- `raw/` was not used — sources are parent files per autowiki scope rules; R1 WHY-line gate not applicable here.
