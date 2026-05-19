#!/usr/bin/env bash
# Intake gate. Usage: ./ingest.sh <file-or-url> "<why-summary>"
# Enforces R1: every raw/ file must start with WHY line.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$ROOT/raw"

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <source-file> \"<why this matters in one sentence>\"" >&2
  exit 1
fi

SRC="$1"
WHY="$2"

if [[ ! -f "$SRC" ]]; then
  echo "source not found: $SRC" >&2
  exit 1
fi

BASE="$(basename "$SRC")"
SLUG="$(echo "${BASE%.*}" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-')"
DEST="$RAW/${SLUG}.md"

if [[ -e "$DEST" ]]; then
  echo "exists: $DEST — refusing overwrite" >&2
  exit 1
fi

{
  echo "> WHY: $WHY"
  echo ""
  echo "<!-- ingested: $(date -u +%Y-%m-%dT%H:%M:%SZ) from $SRC -->"
  echo ""
  cat "$SRC"
} > "$DEST"

SHA="$(shasum -a 256 "$DEST" | awk '{print $1}')"
echo "ingested: $DEST"
echo "sha256:   $SHA"
