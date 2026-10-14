# Basalt

Basalt is a dark, minimal Obsidian theme. It takes its base from the Claude docs
pages (near-black canvas, light serif headings at weight 400, sans body, hairline
gray boxes) and adds editorial details from the Antimetal design system (mono
tracked eyebrows, dashed hairlines, pill buttons, no shadows on content). A light
mode uses the same tokens with neutral white, not cream. Target: Obsidian 1.6+,
tested against 1.14.x on macOS.

## Structure

```
src/theme.css        authored CSS (edit this)
src/fonts/           Geist and Geist Mono variable WOFF2 (OFL, see OFL.txt)
theme.css            build output, do not edit
manifest.json        Obsidian theme manifest
scripts/build.sh     src -> theme.css with fonts inlined; refreshes test-vault copy
scripts/install.sh   builds, then installs into a vault
test-vault/          fixture vault for visual checks (theme copy is generated)
screenshots/         verification screenshots
```

## Build

```sh
scripts/build.sh
```

Replaces `__GEIST_SANS__` and `__GEIST_MONO__` in `src/theme.css` with base64
WOFF2 data URIs, writes `theme.css` at the repo root, and copies it plus
`manifest.json` into `test-vault/.obsidian/themes/Basalt/`.

## Install

```sh
scripts/install.sh ~/Vaults/X
```

Copies the built theme into `~/Vaults/X/.obsidian/themes/Basalt/`. It does not
change `appearance.json`. Activate it in Obsidian: Settings → Appearance →
Themes → Basalt.

## Fonts

- Geist and Geist Mono are embedded (variable weights) under the SIL Open Font
  License 1.1. See `src/fonts/OFL.txt`.
- Headings use `Tiempos Headline` if installed, then `Source Serif 4`,
  `Newsreader`, and Georgia. Tiempos is never embedded.
- Your own font settings in Obsidian win. The theme does not touch
  `*-override` variables.

## Verification workflow

1. Run `scripts/build.sh`. It refreshes `test-vault/`.
2. Open `test-vault/` in Obsidian and select Basalt.
3. Check dark and light modes, the reading and live-preview views, and the
   core chrome (sidebars, tabs, modals, menus, callouts, tables, code blocks).
4. Save screenshots to `screenshots/` and compare them against the reference
   screenshots.
