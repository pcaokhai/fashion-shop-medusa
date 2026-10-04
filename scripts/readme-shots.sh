#!/usr/bin/env bash
# Captures the README screenshots into docs/img/ with agent-browser.
# Usage: scripts/readme-shots.sh [base-url]   (default http://localhost:8000; run against `pnpm build && pnpm start -p 8000`: dev mode paints a badge into shots)
set -euo pipefail
BASE=${1:-http://localhost:8000}
OUT="$(cd "$(dirname "$0")/.." && pwd)/docs/img"
mkdir -p "$OUT"

shot() { # name width height path
  agent-browser set viewport "$2" "$3" >/dev/null
  agent-browser open "$BASE$4" >/dev/null
  sleep 2
  agent-browser screenshot --full 2>&1 | tail -n1 | sed 's/.*to //' | xargs -I{} cp {} "$OUT/$1.png"
  echo "docs/img/$1.png"
}

PRODUCT=$(curl -s "$BASE/c/all" | grep -o '/p/[a-z0-9-]*' | head -n1)
for w in "desktop 1440 900" "mobile 375 800"; do
  set -- $w
  shot "home-$1" "$2" "$3" /
  shot "listing-$1" "$2" "$3" /c/ao
  shot "product-$1" "$2" "$3" "$PRODUCT"
done
shot search-desktop 1440 900 "/search?q=so%20mi"
agent-browser close >/dev/null 2>&1 || true
