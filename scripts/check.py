#!/usr/bin/env python3
"""Basalt design-system check: enforces the rules in SPEC.md that code can verify.

Usage: python3 scripts/check.py [--app-css PATH]   (or OBSIDIAN_APP_CSS=PATH)

Reads the modules src/index.css imports and the token role table in SPEC.md.
Errors (exit 1):
  raw-colour   hex, rgb()/hsl()-family literal or named colour outside the
               .theme-dark / .theme-light blocks of src/foundation/tokens.css
  radius       a radius that isn't 0, a percentage or a var(); px values belong
               to the radius scale in src/foundation/tokens.css
  font-size    a px/rem font size outside the UI type scale in tokens.css
               (em is fine: content sizes are relative to the user's text size)
  token-role   a --basalt-* token defined in src/foundation/ but missing from
               the SPEC.md role table, or listed there but not defined
               (skipped when the local, untracked SPEC.md is absent)
  unused-token a --basalt-* token defined in src/foundation/ and never read
  undefined    var(--basalt-*) that no module defines
  contrast     a text token below its floor (CONTRAST below) on a surface
  important    !important without a comment on its line or the line above
With --app-css, also warns about Obsidian variables mappings.css sets that
Obsidian's app.css never reads (warning only: plugins and JS may read them).
"""
import colorsys
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
TOKENS = "foundation/tokens.css"
MODES = (".theme-dark", ".theme-light")

# (text token, floor, surfaces it must clear). 4.5:1 is WCAG AA body text;
# 3:1 is AA large text and UI components (accent marks state and link hover,
# never body copy). Faint is small real text (status bar, H6, breadcrumbs), so
# it needs body contrast on every ground except surface-3 (pressed fills).
SURFACES = ["bg", "bg-sidebar", "surface-1", "surface-2", "surface-3"]
CONTRAST = [
    ("text", 4.5, SURFACES),
    ("text-strong", 4.5, SURFACES),
    ("text-muted", 4.5, SURFACES),
    ("text-faint", 4.5, ["bg", "bg-sidebar", "surface-1", "surface-2"]),
    ("accent", 3.0, SURFACES),
]

NAMED = ("white|black|red|green|blue|gray|grey|silver|maroon|purple|fuchsia|lime|"
         "olive|yellow|navy|teal|aqua|orange|pink|brown")
RAW_COLOUR = re.compile(
    r"#[0-9a-fA-F]{3,8}\b"
    r"|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d.]"
    r"|(?<![\w-])(?:" + NAMED + r")(?![\w-])")
LENGTH = re.compile(r"(?<![\w.-])-?[\d.]+(px|rem|em)\b")


def die(msg):
    sys.exit("check.py: error: " + msg)


def modules():
    entry = os.path.join(SRC, "index.css")
    with open(entry, encoding="utf-8") as f:
        return re.findall(r'^@import\s+"([^"]+)";', f.read(), re.M)


def strip_comments(text):
    """Blank out comments, keeping line numbers."""
    return re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), text, flags=re.S)


def declarations(path, text):
    """Yield (line, selector, property, value). Flat parser: enough for this repo."""
    clean = strip_comments(text)
    stack, buf, start, quote = [], "", None, None
    line = 1
    for ch in clean:
        if ch == "\n":
            line += 1
        if quote:
            buf += ch
            if ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
        if ch == "{":
            stack.append(" ".join(buf.split()))
            buf, start = "", None
        elif ch == "}" or ch == ";":
            decl = buf.strip()
            if decl and ":" in decl and stack and not decl.startswith("@"):
                prop, value = decl.split(":", 1)
                yield start, stack[-1], prop.strip(), value.strip()
            buf, start = "", None
            if ch == "}" and stack:
                stack.pop()
        else:
            if start is None and not ch.isspace():
                start = line
            buf += ch


def scrub(value):
    """Drop url(...), strings and custom-property names before matching values."""
    value = re.sub(r"url\((?:\"[^\"]*\"|'[^']*'|[^)]*)\)", "", value)
    value = re.sub(r"\"[^\"]*\"|'[^']*'", "", value)
    return re.sub(r"--[\w-]+", "", value)


# --- colour maths -------------------------------------------------------------

def parse_colour(value, scope, depth=0):
    value = value.strip()
    m = re.fullmatch(r"var\((--[\w-]+)\)", value)
    if m and depth < 10 and m.group(1) in scope:
        return parse_colour(scope[m.group(1)], scope, depth + 1)
    m = re.fullmatch(r"#([0-9a-fA-F]{6})", value)
    if m:
        h = m.group(1)
        return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    m = re.fullmatch(r"hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)", value)
    if m:
        h, s, l = (float(x) for x in m.groups())
        return colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
    m = re.fullmatch(r"hsl\(\s*var\((--[\w-]+)\)\s+var\((--[\w-]+)\)\s+var\((--[\w-]+)\)\s*\)", value)
    if m and all(v in scope for v in m.groups()):
        h, s, l = (float(scope[v].rstrip("%")) for v in m.groups())
        return colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
    return None


def contrast(a, b):
    def lum(c):
        r, g, b_ = (v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b_
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


# --- main -----------------------------------------------------------------------

def main(argv):
    app_css = os.environ.get("OBSIDIAN_APP_CSS")
    if argv[:1] == ["--app-css"] and len(argv) == 2:
        app_css = argv[1]
    elif argv:
        die("usage: scripts/check.py [--app-css PATH]")

    errors, warnings = [], []

    def err(rel, line, rule, msg):
        errors.append("src/%s:%s: %s: %s" % (rel, line, rule, msg))

    decls = []          # (rel, line, selector, prop, value)
    raw = {}
    for rel in modules():
        with open(os.path.join(SRC, rel), encoding="utf-8") as f:
            raw[rel] = f.read()
        decls += [(rel,) + d for d in declarations(rel, raw[rel])]

    mode_scope = {m: {} for m in MODES}
    mode_line = {m: {} for m in MODES}
    shared_scope = {}
    defined_foundation, defined_any, used = {}, set(), set()

    for rel, line, sel, prop, value in decls:
        in_tokens = rel == TOKENS
        is_mode_block = in_tokens and sel in MODES
        is_scale = in_tokens and prop.startswith("--basalt-")
        if prop.startswith("--"):
            if sel in MODES:
                mode_scope[sel][prop] = value
                if in_tokens:
                    mode_line[sel][prop] = line
            elif sel == ", ".join(MODES) or sel == ",".join(MODES):
                shared_scope[prop] = value
        if prop.startswith("--basalt-"):
            defined_any.add(prop)
            if rel.startswith("foundation/"):
                defined_foundation.setdefault(prop, (rel, line))
        used.update(re.findall(r"var\((--basalt-[\w-]+)", value))

        plain = scrub(value)
        if not is_mode_block and RAW_COLOUR.search(plain):
            err(rel, line, "raw-colour", "%s: %s (colours belong in the token blocks of %s)" % (prop, value, TOKENS))

        if not is_scale and re.search(r"radius", prop):
            if LENGTH.search(plain):
                err(rel, line, "radius", "%s: %s (use a --basalt-radius-* step)" % (prop, value))

        if not is_scale and (prop == "font-size" or "font-size" in prop or prop.startswith("--font-ui-")):
            if re.search(r"(?<![\w.-])-?[\d.]+(px|rem)\b", plain):
                err(rel, line, "font-size", "%s: %s (use a --basalt-ui-* step, or em for content)" % (prop, value))

    # Undefined and unused tokens.
    for rel, line, sel, prop, value in decls:
        for name in re.findall(r"var\((--basalt-[\w-]+)", value):
            if name not in defined_any:
                err(rel, line, "undefined", "%s is not defined" % name)
    for name, (rel, line) in sorted(defined_foundation.items()):
        if name not in used:
            err(rel, line, "unused-token", "%s is never read" % name)

    # SPEC role table: every foundation token has a row, every row a token.
    # SPEC.md is a local, untracked design doc; a fresh clone skips this rule.
    spec_path = os.path.join(ROOT, "SPEC.md")
    if os.path.isfile(spec_path):
        with open(spec_path, encoding="utf-8") as f:
            spec = f.read()
        listed = set()
        for row in re.findall(r"^\|([^|\n]*)\|", spec, re.M):
            listed.update(re.findall(r"`(--basalt-[\w-]+)`", row))
        for name, (rel, line) in sorted(defined_foundation.items()):
            if name not in listed:
                err(rel, line, "token-role", "%s has no row in the SPEC.md token role table" % name)
        for name in sorted(listed - set(defined_foundation)):
            errors.append("SPEC.md: token-role: %s is listed but not defined in src/foundation/" % name)

    # Contrast floors, per mode.
    for mode in MODES:
        scope = dict(shared_scope)
        scope.update(mode_scope[mode])
        for text, floor, grounds in CONTRAST:
            at = mode_line[mode].get("--basalt-" + text, "?")
            fg = parse_colour(scope.get("--basalt-" + text, ""), scope)
            if fg is None:
                err(TOKENS, at, "contrast", "%s: can't parse --basalt-%s" % (mode, text))
                continue
            for ground in grounds:
                bg = parse_colour(scope.get("--basalt-" + ground, ""), scope)
                if bg is None:
                    err(TOKENS, at, "contrast", "%s: can't parse --basalt-%s" % (mode, ground))
                    continue
                ratio = contrast(fg, bg)
                if ratio < floor:
                    err(TOKENS, at, "contrast", "%s --basalt-%s on --basalt-%s is %.2f:1, floor %.1f:1"
                        % (mode, text, ground, ratio, floor))

    # !important needs a reason next to it.
    for rel, text in raw.items():
        lines = text.split("\n")
        for i, l in enumerate(lines):
            if "!important" in l and "/*" not in l and (i == 0 or "/*" not in lines[i - 1] and "*/" not in lines[i - 1]):
                err(rel, i + 1, "important", "!important without a comment saying what it beats")

    # Optional: Obsidian variables that app.css never reads.
    if app_css:
        if not os.path.isfile(app_css):
            die("app.css not found: " + app_css)
        with open(app_css, encoding="utf-8", errors="replace") as f:
            app = f.read()
        read = set(re.findall(r"var\(\s*(--[\w-]+)", app))
        for rel, line, sel, prop, value in decls:
            if rel == "foundation/mappings.css" and prop.startswith("--") and not prop.startswith("--basalt-") and prop not in read:
                warnings.append("src/%s:%s: unread: %s is never read by app.css" % (rel, line, prop))

    for w in warnings:
        print("warning: " + w, file=sys.stderr)
    for e in errors:
        print(e, file=sys.stderr)
    if errors:
        print("check.py: %d error(s)" % len(errors), file=sys.stderr)
        return 1
    print("check.py: OK (%d modules, %d tokens)" % (len(raw), len(defined_foundation)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
