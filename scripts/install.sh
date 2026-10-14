#!/bin/bash
# Build Folio and install it into an Obsidian vault. Does not change appearance.json.
# Usage: scripts/install.sh <vault-path>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

die() {
  echo "install.sh: error: $*" >&2
  exit 1
}

[ $# -eq 1 ] || die "usage: scripts/install.sh <vault-path>"
VAULT="${1%/}"
[ -d "$VAULT/.obsidian" ] || die "$VAULT/.obsidian not found; is this an Obsidian vault?"

"$ROOT/scripts/build.sh"

DEST="$VAULT/.obsidian/themes/Folio"
mkdir -p "$DEST"
cp "$ROOT/manifest.json" "$ROOT/theme.css" "$DEST/"

echo "Installed Folio to $DEST"
echo "Activate: Obsidian → Settings → Appearance → Themes → Folio"
