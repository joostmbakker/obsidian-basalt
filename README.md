<h3 align="center">A dark, minimal theme for Obsidian.</h3>

<p align="center"><em>Quiet by default, with a matching light mode.</em></p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#features">Features</a> ·
  <a href="#options">Options</a> ·
  <a href="https://github.com/joostmbakker/obsidian-basalt/releases/latest">Latest release</a>
</p>

## Overview

**Basalt** keeps a near-black ground and white text, and puts the character in
the details: serif headings, a clean sans body, small mono labels,
hairline boxes and graphite grays.

**Colour is a signal, not a fill.** A red accent marks focus, the active tab
and the current note in the graph, and little else. Soft hues appear only where
they carry meaning: callouts, canvas groups and graph colour groups.

![Basalt in dark and light mode](./images/listing/05-dark-and-light.png)

## Screenshots

<table>
  <tr>
    <td><img src="./images/listing/02-dark.png" alt="A note in dark mode, with the file explorer, graph view and outline"></td>
    <td><img src="./images/listing/03-light.png" alt="The same note in light mode"></td>
  </tr>
  <tr>
    <td><img src="./images/listing/04-canvas.png" alt="A canvas with coloured groups, mono labels and dashed frames"></td>
    <td><img src="./images/listing/01-hero.png" alt="The Basalt wordmark beside a note in dark mode"></td>
  </tr>
</table>

## Features

- **Dark and light from one set of tokens.** Body, muted and faint text all meet
  WCAG AA contrast on the surfaces they sit on.
- **Bundled type.** Geist, Geist Mono and Basalt Serif (a subset of Source
  Serif 4) are embedded. The theme makes no network requests.
- **Callouts as annotations.** A mono title in the callout colour and a hairline
  rule, without a tinted box.
- **Canvas.** Mono group labels with a colour swatch, dashed group frames, and
  labels that line up with Advanced Canvas's collapse toggle.
- **Graph.** Monochrome nodes and links, with the accent on the current note.
- **Quiet controls.** 28px buttons with a hairline ring, an ink primary button,
  and an editorial empty state.
- **Snippet friendly.** No `!important`, styling through Obsidian's CSS
  variables, and your own font settings always win.

## Install

From Obsidian: **Settings → Appearance → Themes → Manage**, search for
**Basalt**, then **Install and use**.

Manually: download `theme.css` and `manifest.json` from the
[latest release](https://github.com/joostmbakker/obsidian-basalt/releases/latest) into
`<your vault>/.obsidian/themes/Basalt/`, then select Basalt under
**Settings → Appearance → Themes**.

Requires Obsidian 1.6 or later. Tested on Obsidian 1.14 (desktop).

## Options

The tab bar above notes uses **Underline** by default, with no plugin or setup
needed. With the [Style Settings](https://github.com/obsidian-community/obsidian-style-settings)
plugin installed, **Settings → Style Settings → Basalt** offers a **Tab style**:
Obsidian, Underline (default), Track, Ink, Sheet or Indexed.

## Fonts

- Geist and Geist Mono are subsets covering Latin (including extended Latin),
  combining accents, common punctuation, currencies, arrows, maths and keyboard
  symbols.
  Other scripts use the fallback fonts in Obsidian. The full weight range and
  OpenType features of retained glyphs are preserved.
  © Vercel, under the SIL Open Font License 1.1. See
  [`src/fonts/OFL.txt`](src/fonts/OFL.txt).
- Basalt Serif is a Latin subset of Source Serif 4 (© Adobe, SIL Open Font
  License 1.1; weights 400–700, optical sizes 16–48), used for headings, the
  inline title and blockquotes. Subsetting makes it a Modified Version, and
  "Source" is a Reserved Font Name, so it ships under its own name. See
  [`src/fonts/OFL-SourceSerif4.txt`](src/fonts/OFL-SourceSerif4.txt).
- `theme.css` carries both copyright notices and the licence text.
- Fonts you set in Obsidian override these. The theme doesn't touch the
  `*-override` variables.

## Development

<details>
<summary>Build from source, install into a vault, preview harness</summary>

`theme.css` is generated; edit the modules under `src/` and rebuild.

```
src/index.css        build entry: ordered @import list (= cascade order)
src/foundation/      Style Settings options, fonts, tokens, Obsidian variable mappings
src/editor/          note content: headings, code, tables, callouts, ...
src/app/             chrome: workspace, tabs, navigation, controls, overlays, ...
src/views/           canvas, graph, bases
src/fonts/           Geist, Geist Mono and Basalt Serif variable WOFF2 + licences
theme.css            build output, committed because Obsidian installs it
manifest.json        Obsidian theme manifest
screenshot.png       cover image for the community listing
images/listing/      listing and README screenshots
scripts/build.sh     src/ -> theme.css, modules and fonts inlined, CSS minified
scripts/minify.mjs   formatting/comment minifier; retains licences, settings and scan directives
scripts/check.py     design-system check, run by build.sh
scripts/install.sh   build, then copy into a vault
scripts/preview/     DOM-replica screenshot harness
```

### Build

Requires Python 3 and Node.js 22 or later. Install the locked build dependencies
once with `npm ci` (and again when `package-lock.json` changes).

```sh
npm ci
scripts/build.sh
npm test
```

Runs `scripts/check.py` first and stops if it fails. The check keeps colours
inside the token blocks, radii and UI type on their scales, every token defined
and used, and text above its contrast floor. The build then inlines the modules
`src/index.css` imports, in order, replaces the font placeholders in
`src/foundation/fonts.css` with base64 WOFF2 data URIs, and minifies `theme.css`
with cssnano's lite preset. Minification removes formatting and ordinary
comments while retaining font copyright notices and licences, Style Settings,
and compatibility-scan directives. It does not merge rules or rewrite the
design's declarations; the source modules remain readable.
When a local `test-vault/.obsidian` exists (gitignored), it also copies the
theme there.

### Install into a vault

```sh
scripts/install.sh ~/path/to/vault
```

Copies the built theme into `<vault>/.obsidian/themes/Basalt/`. It doesn't
change `appearance.json`; select the theme in Obsidian afterwards.

### Preview harness

`scripts/preview/preview.mjs` screenshots HTML replicas of Obsidian's DOM (tab
bar, graph view and controls, find and replace, notices, empty state, links and
bundled fonts) with
Obsidian's own `app.css` and the built `theme.css`, in dark and light mode, with
hover and focus forced through Chrome DevTools.

```sh
scripts/build.sh
node scripts/preview/preview.mjs /path/to/obsidian/app.css
```

Options: `--only graph,find` (fixtures: `tabbar`, `graph`, `find`, `notices`,
`empty`), `--modes dark`, `--theme other.css`, `--out dir`, `--scale 2`. Output
goes to the gitignored `preview-out/`. It needs Playwright installed globally
(`npm i -g playwright`) and a Chromium it can launch (`CHROMIUM_PATH` to pick
one). `app.css` is Obsidian's file: pass its path, never commit it.

The harness renders replicas, not the app: layout JS, CodeMirror, plugins and
the graph renderer don't run. Confirm visual changes in Obsidian itself, in
dark and light mode, reading and live preview.

</details>

## Credits

Early versions started from Anthropic's Claude documentation (near-black
ground, serif headings, hairline boxes); Basalt has since moved to its own
palette and accent. Editorial details (mono labels, dashed hairlines) come from
the Antimetal design system. Basalt is not affiliated with either.

## License

The theme code is released under the [MIT License](LICENSE). The embedded fonts
keep their own licence, the SIL Open Font License 1.1 (see [Fonts](#fonts)).
