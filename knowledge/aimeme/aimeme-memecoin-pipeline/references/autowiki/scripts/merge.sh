#!/usr/bin/env bash
# Promote wiki.proposed/ -> wiki/ after human review.
# Usage:
#   ./merge.sh            # show diff, no apply
#   ./merge.sh --apply    # apply all proposed changes
#   ./merge.sh <file>     # apply single file

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROP="$ROOT/wiki.proposed"
WIKI="$ROOT/wiki"

if [[ ! -d "$PROP" ]] || [[ -z "$(ls -A "$PROP" 2>/dev/null)" ]]; then
  echo "no proposals."
  exit 0
fi

apply_one() {
  local rel="$1"
  local src="$PROP/$rel"
  local dst="$WIKI/$rel"
  if grep -q "PROPOSE DELETE" "$src" 2>/dev/null; then
    echo "DELETE: $rel — review then run: rm \"$dst\" && rm \"$src\""
    return
  fi
  mkdir -p "$(dirname "$dst")"
  mv "$src" "$dst"
  echo "applied: $rel"
}

if [[ "${1:-}" == "--apply" ]]; then
  while IFS= read -r f; do
    rel="${f#$PROP/}"
    apply_one "$rel"
  done < <(find "$PROP" -type f -name '*.md')
  exit 0
fi

if [[ -n "${1:-}" ]] && [[ "${1:-}" != "--apply" ]]; then
  apply_one "$1"
  exit 0
fi

echo "=== proposed changes (review before --apply) ==="
for f in $(find "$PROP" -type f -name '*.md'); do
  rel="${f#$PROP/}"
  dst="$WIKI/$rel"
  echo ""
  echo "--- $rel ---"
  if [[ -f "$dst" ]]; then
    diff -u "$dst" "$f" || true
  else
    echo "(NEW FILE)"
    head -20 "$f"
  fi
done
echo ""
echo "to apply all:    $0 --apply"
echo "to apply one:    $0 <relative-path>"
