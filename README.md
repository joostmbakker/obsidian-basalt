# Basalt

Basalt is a dark, minimal Obsidian theme. It takes its base from the Claude docs
pages (near-black canvas, light serif headings at weight 400, sans body, hairline
gray boxes) and adds editorial details from the Antimetal design system (mono
tracked eyebrows, dashed hairlines, pill buttons, no shadows on content). A light
mode uses the same tokens with neutral white, not cream. Target: Obsidian 1.6+,
tested against 1.14.x on macOS.

## Structure

```
src/index.css        build entry: ordered @import list (= cascade order)
src/foundation/      Style Settings options, fonts, tokens, Obsidian variable mappings
src/editor/          note content: headings, code, tables, callouts, ...
src/app/             chrome: workspace, tabs, navigation, controls, overlays, ...
src/views/           canvas, graph, bases
src/fonts/           Geist and Geist Mono variable WOFF2 (OFL, see OFL.txt)
theme.css            build output, do not edit
manifest.json        Obsidian theme manifest
scripts/build.sh     src/ -> theme.css with modules and fonts inlined; refreshes local test-vault copy if present
scripts/check.py     design-system check (run by build.sh; see SPEC.md)
scripts/install.sh   builds, then installs into a vault
scripts/preview/     DOM-replica screenshot harness (see Preview harness)
test-vault/          optional local vault for visual checks (gitignored, not in the repo)
screenshots/         verification screenshots
```

## Build

```sh
scripts/build.sh
```

Runs `scripts/check.py` first and stops if it fails: it enforces the rules
`SPEC.md` marks ✓ (colours only in the token blocks, radius and UI type from
scales, a SPEC role for every token, text contrast floors). Then it inlines
the modules `src/index.css` imports, in order, replaces `__GEIST_SANS__` and
`__GEIST_MONO__` (in `src/foundation/fonts.css`) with base64 WOFF2 data URIs,
writes `theme.css` at the repo root, and, when a local
`test-vault/.obsidian` exists, copies it plus `manifest.json` into
`test-vault/.obsidian/themes/Basalt/`. Without a local vault the copy is skipped.

## Install

```sh
scripts/install.sh ~/Vaults/X
```

Copies the built theme into `~/Vaults/X/.obsidian/themes/Basalt/`. It does not
change `appearance.json`. Activate it in Obsidian: Settings → Appearance →
Themes → Basalt.

## Options

The tab bar above notes uses **Underline** by default, with no plugin or setup needed.
With the [Style Settings](https://github.com/obsidian-community/obsidian-style-settings)
community plugin installed, Settings → Style Settings → Basalt offers a **Tab style**
to choose Obsidian, Underline (default), Track, Ink, Sheet, or Indexed. An explicitly
saved choice takes precedence over the built-in default.

## Fonts

- Geist and Geist Mono are embedded (variable weights) under the SIL Open Font
  License 1.1. See `src/fonts/OFL.txt`.
- Headings use `Tiempos Headline` if installed, then `Source Serif 4`,
  `Newsreader`, and Georgia. Tiempos is never embedded.
- Your own font settings in Obsidian win. The theme does not touch
  `*-override` variables.

## Preview harness

`scripts/preview/preview.mjs` screenshots HTML replicas of Obsidian's DOM for
the tab bar, graph view and its controls, the find and replace bar, notices,
and the empty state, with Obsidian's own `app.css` and the built `theme.css`
loaded, in dark and light mode. Hover and focus states are forced through
Chrome DevTools (`CSS.forcePseudoState`).

```sh
scripts/build.sh
node scripts/preview/preview.mjs /path/to/obsidian/app.css
# or: OBSIDIAN_APP_CSS=/path/to/app.css node scripts/preview/preview.mjs
```

Options: `--only graph,find` (fixture ids: `tabbar`, `graph`, `find`,
`notices`, `empty`), `--modes dark`, `--theme other.css`, `--out dir`,
`--scale 2`. Output goes to `preview-out/<fixture>/` (gitignored): one board
per mode (`dark.png`) plus one image per frame (`dark-01.png`).

Notes:

- `app.css` is Obsidian's file. Pass its path; never commit it. Extract it
  from your Obsidian install (`obsidian.asar`) or the app's DevTools.
- Needs Playwright installed globally (`npm i -g playwright`, resolved via
  `npm root -g`) and a Chromium it can launch; set `CHROMIUM_PATH` to use a
  specific binary.
- It is a replica, not the app. Layout JS, CodeMirror, plugins and the PixiJS
  graph don't run: the graph is an SVG drawn with the colours Obsidian would
  read from its hidden `.graph-view.color-*` elements. Markup that `app.css`
  doesn't pin down is marked `GUESS:` in `scripts/preview/fixtures.mjs`.
  Confirm visual changes in Obsidian itself.

## Verification workflow

1. Run `scripts/build.sh`. It refreshes a local `test-vault/` when present.
2. Optionally run the preview harness for the components it covers.
3. Open your local `test-vault/` (or a vault you name) in Obsidian and select Basalt.
4. Check dark and light modes, the reading and live-preview views, and the
   core chrome (sidebars, tabs, modals, menus, callouts, tables, code blocks).
5. Save screenshots to `screenshots/` and compare them against the reference
   screenshots.
