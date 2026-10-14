#!/bin/bash
# Build Basalt: src/theme.css -> theme.css with Geist fonts inlined as base64 WOFF2.
# Also refreshes the local, gitignored test-vault copy when test-vault/.obsidian exists.
# Override the source with BASALT_SRC=/path/to/file.css (used for testing).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${BASALT_SRC:-$ROOT/src/theme.css}"
SANS_FONT="$ROOT/src/fonts/Geist-Variable.woff2"
MONO_FONT="$ROOT/src/fonts/GeistMono-Variable.woff2"
MANIFEST="$ROOT/manifest.json"
OUT="$ROOT/theme.css"
VAULT_THEME="$ROOT/test-vault/.obsidian/themes/Basalt"

die() {
  echo "build.sh: error: $*" >&2
  exit 1
}

[ -f "$SRC" ] || die "source not found: $SRC (create src/theme.css or set BASALT_SRC)"
for f in "$SANS_FONT" "$MONO_FONT" "$MANIFEST"; do
  [ -f "$f" ] || die "required file missing: $f"
done

# Substitute placeholders with base64 data URIs. Paths are passed as argv, not interpolated.
python3 -I -c '
import base64, sys

src, sans, mono, out = sys.argv[1:5]
header = ("/* Basalt — generated from src/theme.css by scripts/build.sh. Do not edit. "
          "Geist fonts © Vercel, SIL OFL 1.1 */\n")

with open(src, encoding="utf-8") as f:
    css = f.read()

def data_uri(path):
    with open(path, "rb") as f:
        return "data:font/woff2;base64," + base64.b64encode(f.read()).decode("ascii")

for token, path in (("__GEIST_SANS__", sans), ("__GEIST_MONO__", mono)):
    if token not in css:
        sys.exit("build.sh: error: placeholder " + token + " not found in " + src)
    css = css.replace(token, data_uri(path))

with open(out, "w", encoding="utf-8") as f:
    f.write(header + css)
' "$SRC" "$SANS_FONT" "$MONO_FONT" "$OUT"

if [ -d "$ROOT/test-vault/.obsidian" ]; then
  mkdir -p "$VAULT_THEME"
  cp "$MANIFEST" "$OUT" "$VAULT_THEME/"
  vault_msg="Copied manifest.json + theme.css to ${VAULT_THEME#"$ROOT"/}/"
else
  vault_msg="test-vault/ not found; skipped local copy"
fi

bytes="$(wc -c < "$OUT" | tr -d ' ')"
echo "Built $OUT (${bytes} bytes, $((bytes / 1024)) KiB)"
echo "$vault_msg"
