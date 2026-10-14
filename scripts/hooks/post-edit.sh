#!/bin/bash
# Claude Code PostToolUse hook (.claude/settings.json): after an edit to a src/
# CSS module or SPEC.md, rebuild, which runs scripts/check.py. Exit 2 hands the
# errors back to Claude; the edit itself stands.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
path="$(python3 -I -c 'import json, sys; print(json.load(sys.stdin).get("tool_input", {}).get("file_path", ""))')" || exit 0

case "$path" in
  "$ROOT"/src/*.css | "$ROOT"/SPEC.md) ;;
  *) exit 0 ;;
esac

if ! out="$("$ROOT/scripts/build.sh" 2>&1)"; then
  echo "$out" >&2
  exit 2
fi
