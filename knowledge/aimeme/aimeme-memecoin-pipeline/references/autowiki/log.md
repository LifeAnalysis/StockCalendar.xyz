# autowiki event log

Append-only chronological record. Format: `## [YYYY-MM-DD HH:MM] <event-type> | <summary>` — event types: seed, ingest, query, reweave, merge, lint.

## [2026-04-28 15:06] seed | autowiki scaffold initialized
- folders raw/, wiki/, wiki.proposed/, outputs/, scripts/, config/ created

## [2026-04-28 15:09] seed | operating manual + R1–R7 rules drafted
- config/CLAUDE.md and root CLAUDE.md

## [2026-04-28 15:13] seed | initial 11 wiki pages written from cycle-3 conversation context
- sm-conviction-is-non-negotiable
- sm-exit-pattern
- lp-locked-tristate
- monotonic-netflow-score
- top-holder-dumping
- wash-vs-real-velocity
- aggregate-vs-instantaneous-meta-rule
- position-sizing-tiers
- cheap-gate-ordering
- livo-launchpad-backdoor
- sm-conviction-recency

## [2026-04-28 15:13] seed | seed summary written
- outputs/2026-04-28-seed-summary.md

## [2026-04-28 16:42] ingest | wiki.proposed/cheap-gate-ordering.md (post cycle-4 lesson)

## [2026-04-28 16:48] ingest | wiki.proposed/watchlist-price-tracking.md

## [2026-04-28 16:58] ingest | wiki.proposed/v4.0-strict-prefilters.md
- synthesizes web research (Nansen 2026, Photon/BullX/GMGN, pump.fun) into mandatory AND-gate prefilter set

## [2026-04-28 17:00] index | wiki/index.md created

## [2026-04-28 17:00] log | log.md initialized

## [2026-04-28 17:05] reweave | 4 new, 0 stale, 4 contradictions
- raw validated: 6/6 (all pass R1)
- new wiki.proposed: nansen-mcap-liquidity-thresholds, terminal-filter-consensus, pump-fun-lp-zero-default, token2022-emoji-series-pattern
- updated wiki.proposed: v4.0-strict-prefilters (re-derived with raw citations + sha256 footer per R6)
- contradictions: outputs/2026-04-28-contradictions.md (Nansen vs v4.0 on liq floor, top10, bundle, vol/mcap)

## [2026-04-28 17:10] query | full v4.0 strict-pipeline cycle 5 — multi-chain SM screener
- Discovered PUNK v2 (CryptoPunks community memecoin revival) at 0x546500f704367b647d2c3f6417af0a2ad4bc7cd6 on ETH
- 21 named-VC SM accumulating: 1confirmation x5, Galaxy Digital x2, Animoca Brands, SV Angel, Sfermion, BitScale, Cypher Capital, D1 Ventures, LD Capital, Longling, Arrington XRP, Sky9, DevmonsGG, plus anonymous Smart Trader labels
- 4-point score 3.5/4 — first v4.0 strict-pipeline BUY signal
- Filtered out: PEPETIDE (holders 364 < 500 floor), HENRY (re-screened, SM netflow degrading $6,728 → $587 over 30min)

## [2026-04-28 17:15] ingest | raw/punk-v2-cryptopunks-revival.md
- Source doc for PUNK v2 discovery, contract analysis, distribution mechanics, SM signal

## [2026-04-28 17:15] ingest | wiki.proposed/vc-backed-dormant-revival-pattern.md
- New durable concept page documenting the dormant-token-revival pattern surfaced by PUNK v2

## [2026-04-28 17:15] query | outputs/2026-04-28-cycle-5-full-pipeline-run.md
- Cycle 5 full report: discovery → screening → drill → BUY decision → portfolio entry → lessons learned

## [2026-04-28 17:35] lint | applied wiki audit cleanup — 2 deletion tombstones staged, 19 cross-links patched in wiki.proposed/
- Tombstones: dashboard-numbers-audit-lessons.md, v4-experimental-entries-2026-04-28.md (content preserved in outputs/2026-04-28-migrated-*.md)
- Cross-links staged across 9 mirrored files in wiki.proposed/: sm-exit-pattern, sm-conviction-recency, sm-conviction-is-non-negotiable, wash-vs-real-velocity, monotonic-netflow-score, top-holder-dumping, lp-locked-tristate, position-sizing-tiers, cheap-gate-ordering; plus 3 new links appended to existing wiki.proposed/v4.0-strict-prefilters.md
- 1 audit suggestion skipped: dashboard-numbers-audit-lessons → drained-pool-honeypot (source page is tombstoned)
- Awaiting user merge.sh

## [2026-04-28 17:50] reorganize | YAML frontmatter + folder grouping staged in wiki.proposed/
- 14 wiki pages + 6 wiki.proposed pages now have id/category/function/status/related metadata
- Filenames preserved (zero wikilink breakage)
- Subfolder structure: 01-scoring/, 02-gates/, 03-patterns/, 04-meta/ in wiki.proposed/
- New wiki.proposed/index.md rendered for Dataview
- User to merge.sh when ready

## [2026-04-28 17:55] query | outputs/2026-04-28-cycle-5-verdict.md
- Verdict on cycle 5 buy/no-buy decisions filed
- Kill accuracy net positive (xchat save vs BELKA miss); entries too early to judge (<24h)
- v4.1 refinements queued: SM-exit hard-kill nuance, A-tier sizing gate

## [2026-04-28 18:05] rename | 2 wiki slugs migrated per anti-pattern policy
- sm-conviction-is-non-negotiable -> sm-conviction-floor (no opinion-tone in filenames)
- v4.0-strict-prefilters -> strict-prefilter-gauntlet (no version in filenames; version moved to frontmatter)
- Tombstones staged for old slugs in wiki.proposed/ root
- Link references updated across wiki.proposed/, raw/, outputs/, parent pipeline.md and portfolio.md
- Awaiting user merge.sh --apply

## 2026-04-28 21:30 — Cycle 6
- 20 trending pools scanned, 0 BUY
- Survivors to safety: MASCOTS (sol), CAS (base)
- MASCOTS REJECT: rugcheck score 16, LP 0%
- CAS REJECT: GoPlus top1 EOA 85% unlocked
- Infra: OnchainExpat token-safety 404 — fell back to GoPlus public API ($0)
- Spend: $0.02
- Wiki proposals: goplus-evm-safety-fallback, wash-via-symmetric-buy-sell, bsc-out-of-scope-tagging

## 2026-04-28 22:34 — Cycle 7
- 20 trending pools scanned, **0 BUY**, 2 WATCH, 1 ALMOST
- Survivors to safety: MASCOTS, BULL, maxxing (sol), UNICURVE (eth)
- WATCH: MASCOTS 2.74/4 (clean LP recovered to 100%, 1 fresh SM only) — re-score next cycle
- WATCH: BULL 2.735/4 (3 active SM, 2 convicted, monotonic NF+, LP unlocked but age 36d)
- ALMOST: maxxing (drained-pool tracked-liq $4.10 vs GT $238k reserve)
- REJECT UNICURVE (eth): GoPlus clean BUT creator 0xf942 in top-10 holders rank #2 (4.87%) → step-5 hard kill
- 4× pump.fun fresh-launch lp-unlocked kills (MEMEMEMORY/musk/SCAMNALD/BELKA) — same template
- BSC auto-skip eliminated 5/20 pools at step 0 ($0 spend)
- Spend: $0.16 (GT trending $0.01, 2× Nansen TGM SM $0.10, GoPlus $0, 6× Rugcheck $0)
- Wiki proposal: creator-in-top10-evm-kill (02-gates/)
- Output: outputs/2026-04-28-cycle-7-pipeline-run.md

## 2026-04-29 ~10:35 — Cycle 8
- 20 trending pools scanned, **0 BUY**
- Survivors: chudhouse / BULL / GITLAWB (base) / BURNIE
- WATCH: GITLAWB (base, $2.6M, 49d) 2.715/4 — clean GoPlus, 2 convicted SM holding 30d+, monotonic netflow+
- ALMOST: chudhouse (drained tracked liq), BURNIE (drained tracked liq + top1 21%)
- BULL re-WATCH: h6 turned negative since cycle 7
- Spend: $0.07 ($0.01 GT, $0.05 Nansen TGM GITLAWB, GoPlus + Rugcheck free)

## 2026-04-29 ~11:00 — Cycle 9
- Switched discovery vector: Nansen `/smart-money/holdings` (chains=eth/sol/base/arb, mcap $300k-$5M, age 6-60d, balance_24h+5%, holders≥3, value≥$20k)
- 3 candidates surfaced, **all on Base**
- **REJECT NOCOBASE + PRISMA**: same creator `0xd95a366a...`, both `honeypot_with_same_creator: 1`, both typosquats of real OSS projects (NocoBase / Prisma) with `github.com/...` in token_name field — coordinated rug template
- WATCH CYB3RWR3N (base, $1.94M, 48d) 2.72/4 — different creator, clean GoPlus, 3 SM (2 convicted + 1 reaccumulating), 2037 holders. Cross-token signal: same 180D Smart Trader `0xcd83f4` holds both CYB3RWR3N and GITLAWB
- New wiki proposals:
  - `02-gates/goplus-honeypot-with-same-creator-kill.md` — step-3 hard kill on the GoPlus flag
  - `03-patterns/typosquat-oss-token-name-pattern.md` — coordinated rug template, Nansen SM-holdings can surface false positives
- Lesson: SM-holdings discovery is NOT safe alone. GoPlus cross-validation mandatory.
- Closed paper positions per LOOKBACK rule:
  - HENRY -30% stop ($75 → $52.50, -$22.50)
  - Dunald -30% stop ($50 → $35, -$15)
  - PUNK -100% (pool drained, $100 → $0, -$100)
- Total realized cycle 9 closures: -$137.50. Aggregate paper P&L worse.
- Spend: $0.10 ($0.05 SM-holdings, $0.05 CYB3RWR3N TGM, GoPlus free)

## 2026-05-04 ~15:50 — Cycle 10
- Switched to AgentCash-discovered Nansen x402 endpoints: `/smart-money/holdings`, `/token-screener`, `/tgm/holders`, `/tgm/token-information`
- Strict holdings filter returned **0 candidates**; broadened filter surfaced BENAT, MOGGING, CHUD, SUEAAUAN, STACCANA
- **0 strict BUY signals**
- WATCH/ALMOST: BENAT (eth) — GoPlus clean, deepest pool ~$207k, h6/h24 momentum strong, 6 active smart/public holders; capped by thin SM dollar value and UniV4 LP unknown
- REJECT: SUEAAUAN (sol) — attractive surface velocity + LP locked, but Rugcheck full report showed creator-owned top-10 token account
- REJECT: MOGGING/CHUD on Solana LP gates; GRAFANA on Base typosquat + GoPlus `honeypot_with_same_creator=1`
- User-directed spray/pray paper entries after strict verdict:
  - bENAT: $50 D-tier @ $0.8975, 55.71 bENAT
  - KIMCHI: $50 D-tier @ $0.0000009640, 51,867,220 KIMCHI; market-trigger only, full re-vet required before size-up
- Wiki proposals:
  - `02-gates/creator-in-top10-solana-rugcheck.md`
  - `04-meta/spray-sizing-discipline.md`
- Outputs:
  - `outputs/2026-05-04-cycle-10-pipeline-run.md`
  - `outputs/2026-05-04-spray-entries-and-llm-context.md`
  - `/llms-full.txt` context updated to include autowiki catalog, log, latest outputs, and staged proposals

## [2026-05-09 08:45] query | cycle 12 full AgentCash pipeline run
- 20 GeckoTerminal trending pools scanned plus Nansen SM sidecar, 0 BUY
- GT Solana candidates killed by Rugcheck or recent tape: UAP, GAYTES, ALPHA, HANTA, Bear, elonmaxxing, POGE
- Nansen sidecar surfaced SLOP, UNICURVE, HERMESOS, BLOCKTRONICS, APPLE, THREE, CHONKERS, CLAWD; only CHONKERS reached WATCH / ALMOST
- New lesson proposed: `wiki.proposed/02-gates/liquidity-source-disagreement-kill.md`
- Output: `outputs/2026-05-09-cycle-12-pipeline-run.md`

## [2026-05-09 08:49] query | cycle 13 Nansen SM-first workflow
- Ran Nansen `/token-screener` strict pass and `/smart-money/holdings` strict pass before any GT trending
- Holdings surfaced five Solana SM accumulation names: PRATT, HENTAI, PRX, OGNOME, LIMINAL
- Free gates killed PRATT/HENTAI/OGNOME; LIMINAL killed by sell-heavy DexScreener tape
- PRX deep-checked with Nansen TGM: 3 active SM holders, 2 are 180D Smart Trader labels; verdict WATCH / ALMOST due to top-holder concentration and weak h1/h6 tape
- Spend: $0.11; balance ended `$0.0621`
- Output: `outputs/2026-05-09-cycle-13-nansen-sm-first-run.md`

## [2026-05-09 08:56] query | cycle 14 Nansen SM buy-candidate check
- Nansen holdings surfaced UORE as the only new serious candidate plus repeats PRATT/PRX/OGNOME/LIMINAL
- UORE: strong SM and tape, clean contract flags, but LP NFT value mostly creator-controlled and unlocked; verdict aggressive tiny-spec only, not clean BUY
- PRX remains WATCH / ALMOST; tape still weak h1/h6
- Balance ended `$0.0021`
- Output: `outputs/2026-05-09-cycle-14-nansen-sm-buy-candidates.md`

## [2026-05-09 09:00] ingest | buy-workflow.md created
- New default runbook for "what should I buy?" requests
- Sets Nansen `/smart-money/holdings` as primary discovery, cheap Rugcheck/GoPlus/DexScreener gates before TGM spend
- Defines action labels: CLEAN BUY, TINY SPEC, WATCH, NO BUY
- Index updated with `buy-workflow.md`

## [2026-05-17 16:30] cycle 15 | buy-workflow v3.9 run
- 13 SM holdings candidates from Nansen (eth/sol/base/arb, age 0.25-14d, MC $100k-$2M)
- Verdict: NO CLEAN BUY. 1× TINY SPEC (HAUSDORFF), 1× WATCH (OPENHUMAN)
- LP hard gate (lpLockedPct<80 with MC>$300K) killed ROYALPOP, BABYTROLL; LP=0 killed PRATT, TBH
- Spend: $0.11 ($0.05 Nansen holdings + $0.06 Emblem-Nansen trades earlier)
- Output: outputs/2026-05-17-cycle-15-buy-workflow-run.md

## [2026-05-17 16:55] cycle 16 | /trending skill first run
- HAUSDORFF passes SM-exit kill (5 active / 0 exited, 1× 180D-labeled). Score 3.2-3.5/4 → WATCH (LP partial)
- Skill identified 10 concrete improvements — Dexter twitter endpoint missing, conviction-by-holding-age broken for fresh tokens, Step 6 needs cheap pre-screen
- Spend: $0.05 (Nansen tgm/holders HAUSDORFF). Balance $0.78
- Output: outputs/2026-05-17-cycle-16-trending-run.md
