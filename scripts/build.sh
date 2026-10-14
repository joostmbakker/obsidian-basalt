#!/bin/bash
# Build Basalt: src/index.css -> theme.css. Inlines the @import'ed modules in order
# and the Geist fonts as base64 WOFF2. Also refreshes the local, gitignored
# test-vault copy when test-vault/.obsidian exists.
# Override the entry with BASALT_SRC=/path/to/file.css (used for testing); its
# @imports resolve relative to that file.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${BASALT_SRC:-$ROOT/src/index.css}"
SRC_DIR="$ROOT/src"
SANS_FONT="$ROOT/src/fonts/Geist-Variable.woff2"
MONO_FONT="$ROOT/src/fonts/GeistMono-Variable.woff2"
MANIFEST="$ROOT/manifest.json"
OUT="$ROOT/theme.css"
VAULT_THEME="$ROOT/test-vault/.obsidian/themes/Basalt"

die() {
  echo "build.sh: error: $*" >&2
  exit 1
}

[ -f "$SRC" ] || die "source not found: $SRC (create src/index.css or set BASALT_SRC)"
for f in "$SANS_FONT" "$MONO_FONT" "$MANIFEST"; do
  [ -f "$f" ] || die "required file missing: $f"
done

# Inline @import'ed modules, then substitute font placeholders with base64 data
# URIs. Paths are passed as argv, not interpolated.
python3 -I -c '
import base64, os, re, sys

src, src_dir, sans, mono, out = sys.argv[1:6]
header = ("/* Basalt — generated from src/ by scripts/build.sh. Do not edit. "
          "Geist fonts © Vercel, SIL OFL 1.1 */\n")
IMPORT = re.compile(r"^@import\s+\"([^\"]+)\";\s*$")
seen = []

def die(msg):
    sys.exit("build.sh: error: " + msg)

def assemble(path, stack=()):
    path = os.path.realpath(path)
    if path in stack:
        die("import cycle at " + path)
    if path in seen:
        die("imported twice: " + path)
    seen.append(path)
    with open(path, encoding="utf-8") as f:
        lines = f.read().split("\n")
    out = []
    for line in lines:
        m = IMPORT.match(line)
        if not m:
            out.append(line)
            continue
        target = os.path.join(os.path.dirname(path), m.group(1))
        if not os.path.isfile(target):
            die("import not found: " + m.group(1) + " (from " + path + ")")
        rel = os.path.relpath(os.path.realpath(target), os.path.dirname(os.path.realpath(src)))
        out.append("/* src: " + rel + " */\n" + assemble(target, stack + (path,)).rstrip("\n") + "\n")
    return "\n".join(out)

css = assemble(src)

# Every module under src/ must be listed, or it silently never ships.
if os.path.realpath(src) == os.path.realpath(os.path.join(src_dir, "index.css")):
    for d, _, files in os.walk(src_dir):
        for name in files:
            p = os.path.realpath(os.path.join(d, name))
            if name.endswith(".css") and p not in seen:
                die("not imported by src/index.css: " + os.path.relpath(p, src_dir))

def data_uri(path):
    with open(path, "rb") as f:
        return "data:font/woff2;base64," + base64.b64encode(f.read()).decode("ascii")

for token, path in (("__GEIST_SANS__", sans), ("__GEIST_MONO__", mono)):
    if token not in css:
        die("placeholder " + token + " not found in " + src)
    css = css.replace(token, data_uri(path))

with open(out, "w", encoding="utf-8") as f:
    f.write(header + css)
' "$SRC" "$SRC_DIR" "$SANS_FONT" "$MONO_FONT" "$OUT"

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
