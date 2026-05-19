#!/usr/bin/env bash
# Manual reweave trigger. Spawns Claude Code with the autowiki context
# and instructs it to run the reweave protocol per config/CLAUDE.md.
# Run from anywhere.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cat <<EOF
Reweave protocol (manual). Open Claude Code in $ROOT, then ask:

  "Run the reweave protocol per config/CLAUDE.md. Report new/stale/contradictions counts. Do not merge."

Claude will:
  1. Validate raw/ WHY lines (R1)
  2. Hash-compare raw vs wiki citations (R6)
  3. Stage all proposals in wiki.proposed/
  4. Emit outputs/<today>-contradictions.md if any
  5. Print summary

After reviewing wiki.proposed/, run:
  $ROOT/scripts/merge.sh           # show diff
  $ROOT/scripts/merge.sh --apply   # promote all
EOF
