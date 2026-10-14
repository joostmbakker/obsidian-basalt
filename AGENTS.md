# Basalt

Dark, minimal Obsidian theme (CSS only, no plugin code). Design contract: `SPEC.md` (local only, gitignored; may be absent in a fresh clone). Human docs: `README.md`.

## Commands
- `scripts/build.sh`: `src/index.css` -> root `theme.css`, inlining its `@import`ed modules in order and the Geist and Basalt Serif fonts as base64, then copies `theme.css` + `manifest.json` into `test-vault/.obsidian/themes/Basalt/` only when a local `test-vault/.obsidian` exists (otherwise skipped, never created). Runs `scripts/check.py` first and fails with it. Run it after every CSS change.
- `BASALT_SRC=/path/to/file.css scripts/build.sh`: build from an alternate entry (experiments); its `@import`s resolve relative to it.
- In Claude Code, `.claude/settings.json` runs `scripts/hooks/post-edit.sh` after every edit to a `src/` CSS module or `SPEC.md`: it rebuilds, and check errors come back as hook feedback. Fix them before moving on.
- `scripts/install.sh <vault-path>`: build, then copy into a real vault. Writes outside the repo; run it only when the user names the vault.
- `node scripts/preview/preview.mjs <path/to/app.css>` (or `OBSIDIAN_APP_CSS=…`): screenshots DOM replicas of the tab bar, graph view + controls, find/replace bar, notices and empty state with Obsidian's `app.css` + built `theme.css`, dark and light, hover/focus forced via CDP. Output in gitignored `preview-out/<fixture>/`. Flags: `--only graph,find`, `--modes dark`, `--theme file.css`, `--out dir`, `--scale 2`. Run `scripts/build.sh` first.
- `python3 scripts/check.py [--app-css PATH]`: the design-system check on its own. Enforces the ✓ rules in `SPEC.md` (colours only in token blocks, radius and UI type from scales, SPEC role table matches the tokens when `SPEC.md` is present, no unused or undefined tokens, contrast floors, commented `!important`). `--app-css` also warns about mapped Obsidian variables `app.css` never reads.

## Gotchas
- Edit the modules under `src/` (`foundation/`, `editor/`, `app/`, `views/`), never root `theme.css`; the build overwrites it.
- `src/index.css` lists every module in cascade order; later files win specificity ties. Moving an import can change the look. The build fails on a module it doesn't list.
- Keep `url("__GEIST_SANS__")`, `url("__GEIST_MONO__")` and `url("__BASALT_SERIF__")` in `src/foundation/fonts.css`; the build fails when a placeholder is missing.
- Root `theme.css` is generated but committed: Obsidian reads `manifest.json` on the default branch (`main`) and installs `theme.css` + `manifest.json` from the GitHub release tagged with its `version`, and the release workflow attaches the committed files. Rebuild and commit it in the same commit as the `src/` change, so the two never diverge in history.
- `test-vault/` is local-only and gitignored; it may be absent. Don't commit or recreate it.
- When present, `test-vault/.obsidian/snippets/*.css` mirror the user's real vault (custom callouts, card styles). Fix the theme so they render; don't edit the snippets to hide a theme bug.
- Build passing proves syntax, inlining and the SPEC rules, not looks. The preview harness renders replicas, not the app: no layout JS, CodeMirror, plugins or PixiJS graph, and markup marked `GUESS:` in `scripts/preview/fixtures.mjs` is inferred from `app.css` selectors. Use it to check a change, say it's a replica, and still ask the user to check in Obsidian (local `test-vault/` or a vault they name) (dark + light, reading + live preview) before calling a visual change done.
- `app.css` is Obsidian's file: pass its path to the harness, keep it outside the repo, never commit it. When a component isn't covered, add a fixture to `scripts/preview/fixtures.mjs` with selectors taken from `app.css`.

## Conventions
- Design rules, token roles and decisions: `SPEC.md`. It holds no values; values live in `src/` (tokens in `src/foundation/tokens.css`, Obsidian variable mappings in `src/foundation/mappings.css`). Pick tokens by role from SPEC's table; a new `--basalt-*` token gets its SPEC row at the same time.
- Put "why" comments next to the selector they explain (specificity bumps, Obsidian quirks); keep SPEC for design-level decisions.
- A new component is its own file under `src/editor/`, `src/app/` or `src/views/`, opening with a `/* --- Name --- */` banner like its neighbours, and imported from `src/index.css` where its rules belong in the cascade.

## Git workflow

Repo is on GitHub (`origin` = `git@github.com:joostmbakker/obsidian-theme.git`), solo-maintained. In Claude Code the `feature` and `ship` skills run this flow; the repo-specific rules below win where they differ.

### Branches
- `main`: released theme. Obsidian reads it, so it only receives merges from `develop` at release time. Never commit to it directly.
- `develop`: integration branch; PRs target it.
- Work branches from up-to-date `develop`: `feat/<slug>`, `fix/<slug>`, `refactor/<slug>`, `chore/<slug>`, `docs/<slug>`. One branch per component or concern (`feat/canvas-cards`, `fix/table-header-light`), not "theme tweaks".
- Bootstrap (repo has no commits yet; local branch is `master`): `git switch -c main` (or `git branch -m master main`), commit the scaffold, then `git switch -c develop`. Ask the user before pushing either.

### Commits
- Atomic: one logical change per commit, scoped to one component or concern. Revertable on its own and the build passes at every commit.
- A CSS change commit contains the changed `src/` modules + rebuilt `theme.css`. Update the local `SPEC.md` alongside when a token's role, a rule or a decision changes, but never commit it. Font, manifest, script, and fixture changes go in separate commits.
- Stage explicit paths (`git add src/editor/callouts.css theme.css`), never `git add -A` / `.`; `.serena/` and stray screenshots stay out unless intended.
- Conventional Commits, imperative, subject ≤ 50 chars. Scope = component or area named in `SPEC.md`:
  - `feat(callouts): soft tinted border and title color`
  - `fix(tables): header bg in light mode`
  - `refactor(tokens): derive surface-3 from surface-2`
  - `chore(build): fail on missing manifest`
  - `docs(readme): document install script`
  - `test(vault): add nested callout fixture`
- Body only when the why isn't obvious (e.g. which Obsidian selector forced a specificity bump).

### Push and PR
- Push only after the build passes and the user has visually verified the change, or when they ask. `git push -u origin HEAD`.
- `gh pr create --base develop`; title in Conventional Commit form; body: what changed, why, how verified (build output, which notes and modes were checked, screenshots in `screenshots/` if taken).
- Never merge PRs, force-push shared branches, or rewrite history on `develop`/`main` without an explicit request.

### Release
- Bump `version` in `manifest.json` (semver; patch = fixes, minor = new component styling, major = token or variable renames that break user snippets), rebuild, commit `chore(release): <version>`.
- Merge `develop` -> `main` (user does or explicitly requests it), tag `<version>` on `main` with no `v` prefix to match `manifest.json` (`git tag -a <version> -m <version>`), and push the tag. `.github/workflows/release.yml` then drafts a GitHub release with `theme.css` + `manifest.json` attached; the user reviews and publishes it. Release notes = grouped commit subjects since the last tag.
- Obsidian installs from the release whose tag matches `version` in the `main` branch's `manifest.json`, so never bump the version on `main` without a matching release.

### Docs
- `README.md`: update in the same branch when install steps, scripts, repo structure, fonts, or supported Obsidian versions change.
- `SPEC.md` (local, untracked): no literal values. Update it when a token's role, a rule or a design decision changes; never let it describe CSS that no longer exists.
- Never commit `SPEC.md`, `PRODUCT.md`, `audit/` or `test-vault/`; they are gitignored and were purged from history.
- Don't add new doc files (CHANGELOG, CONTRIBUTING) unless asked; release notes live on GitHub releases.
