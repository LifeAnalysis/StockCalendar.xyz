# autowiki vs. LLM-built personal wiki pattern

## Question
Does our autowiki follow the pattern described in the LLM-built personal wiki design doc?

## Verdict
Structurally yes, operationally ~30%. The skeleton matches the pattern and in several places exceeds it on rigor — verb-labeled backlinks (R3), mandatory dry-run staging through wiki.proposed/ (R5), sha256-based staleness detection (R6) — but the active workflow (continuous ingest, query-to-output filing, periodic lint passes) is not being practiced. We built the machine and then mostly stopped feeding it.

## Where we exceed the pattern
- **Verb-taxonomy backlinks** — R3 forces typed relations (supports/contradicts/refines/depends-on), not bare wikilinks.
- **Hash-based stale detection** — R6 tracks raw/ source sha256s so wiki pages flag when their substrate moves.
- **R5 mandatory dry-run** — every ingest goes to wiki.proposed/ first, no direct writes to wiki/.
- **R1 WHY-line intake gate** — every page must declare its reason-to-exist on line one.

## Gaps
- No wiki/index.md until today.
- No log.md until today.
- raw/ was empty — the substrate the system is supposed to weave from didn't exist.
- No continuous ingest cadence.
- Q&A sessions weren't filed to outputs/ — this file is the first non-seed output.
- scripts/reweave.sh has never been invoked.

## Three fixes applied today (2026-04-28 17:00)
1. Populated raw/ with 6 sources captured from session research.
2. Created wiki/index.md as the page catalog.
3. Created log.md as the chronological event log.

## Next recommended step
Invoke `scripts/reweave.sh` to grow the wiki from the freshly populated raw/ files through the proper ingest flow, generating proposals in wiki.proposed/ for review before merge.
