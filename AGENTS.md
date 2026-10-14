# Basalt

Dark, minimal Obsidian theme (CSS only, no plugin code). Design contract: `SPEC.md`. Human docs: `README.md`.

## Commands
- `scripts/build.sh`: `src/theme.css` -> root `theme.css` with Geist fonts inlined as base64, then copies `theme.css` + `manifest.json` into `test-vault/.obsidian/themes/Basalt/`. Only automated check this repo has; run it after every CSS change.
- `BASALT_SRC=/path/to/file.css scripts/build.sh`: build from an alternate source (experiments).
- `scripts/install.sh <vault-path>`: build, then copy into a real vault. Writes outside the repo; run it only when the user names the vault.
- `node scripts/preview/preview.mjs <path/to/app.css>` (or `OBSIDIAN_APP_CSS=…`): screenshots DOM replicas of the tab bar, graph view + controls, find/replace bar, notices and empty state with Obsidian's `app.css` + built `theme.css`, dark and light, hover/focus forced via CDP. Output in gitignored `preview-out/<fixture>/`. Flags: `--only graph,find`, `--modes dark`, `--theme file.css`, `--out dir`, `--scale 2`. Run `scripts/build.sh` first.
- `grep -n '!important' src/theme.css`: every hit needs a reason (see Conventions).

## Gotchas
- Edit `src/theme.css`, never root `theme.css`; the build overwrites it.
- Keep `url("__GEIST_SANS__")` and `url("__GEIST_MONO__")` in `src/theme.css`; the build fails when a placeholder is missing.
- Root `theme.css` is generated but committed: Obsidian installs themes from `theme.css` + `manifest.json` at the repo root of the default branch. Rebuild and commit it in the same commit as the `src/theme.css` change, so the two never diverge in history.
- `test-vault/.obsidian/themes/` is gitignored build output. Everything else in `test-vault/` is a committed fixture.
- `test-vault/.obsidian/snippets/*.css` mirror the user's real vault (custom callouts, card styles). Fix the theme so they render; don't edit the snippets to hide a theme bug.
- Build passing proves syntax and inlining, not looks. The preview harness renders replicas, not the app: no layout JS, CodeMirror, plugins or PixiJS graph, and markup marked `GUESS:` in `scripts/preview/fixtures.mjs` is inferred from `app.css` selectors. Use it to check a change, say it's a replica, and still ask the user to check `test-vault/` in Obsidian (dark + light, reading + live preview) before calling a visual change done.
- `app.css` is Obsidian's file: pass its path to the harness, keep it outside the repo, never commit it. When a component isn't covered, add a fixture to `scripts/preview/fixtures.mjs` with selectors taken from `app.css`.

## Conventions
- Token-driven: raw hex/rgb only inside `.theme-dark` / `.theme-light` token blocks; components use `--basalt-*` tokens. Token values and component specs live in `SPEC.md`; follow it, and update it in the same branch when a design decision changes.
- Obsidian variable mappings go in `.theme-dark, .theme-light { … }` (specificity 0,1,0 beats Obsidian's `body {}` defaults).
- Never set `--font-text-size` or any `*-override` variable; user font settings must win.
- `!important` only to beat an inline or plugin style that can't be beaten otherwise, with a comment saying which.
- Match the existing numbered section banners in `src/theme.css` when adding a component.

## Git workflow

Repo is private on GitHub (`origin` = `git@github.com:joostmbakker/obsidian-theme.git`), solo-maintained. In Claude Code the `feature` and `ship` skills run this flow; the repo-specific rules below win where they differ.

### Branches
- `main`: released theme. Obsidian reads it, so it only receives merges from `develop` at release time. Never commit to it directly.
- `develop`: integration branch; PRs target it.
- Work branches from up-to-date `develop`: `feat/<slug>`, `fix/<slug>`, `refactor/<slug>`, `chore/<slug>`, `docs/<slug>`. One branch per component or concern (`feat/canvas-cards`, `fix/table-header-light`), not "theme tweaks".
- Bootstrap (repo has no commits yet; local branch is `master`): `git switch -c main` (or `git branch -m master main`), commit the scaffold, then `git switch -c develop`. Ask the user before pushing either.

### Commits
- Atomic: one logical change per commit, scoped to one component or concern. Revertable on its own and the build passes at every commit.
- A CSS change commit contains `src/theme.css` + rebuilt `theme.css` (+ `SPEC.md` if the design decision changed). Font, manifest, script, and fixture changes go in separate commits.
- Stage explicit paths (`git add src/theme.css theme.css`), never `git add -A` / `.`; `.serena/` and stray screenshots stay out unless intended.
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
- `gh pr create --base develop`; title in Conventional Commit form; body: what changed, why, how verified (build output, which `test-vault/` notes and modes were checked, screenshots in `screenshots/` if taken).
- Never merge PRs, force-push shared branches, or rewrite history on `develop`/`main` without an explicit request.

### Release
- Bump `version` in `manifest.json` (semver; patch = fixes, minor = new component styling, major = token or variable renames that break user snippets), rebuild, commit `chore(release): <version>`.
- Merge `develop` -> `main` (user does or explicitly requests it), tag `<version>` with no `v` prefix to match `manifest.json`, and attach `theme.css` + `manifest.json` to the GitHub release. Release notes = grouped commit subjects since the last tag.

### Docs
- `README.md`: update in the same branch when install steps, scripts, repo structure, fonts, or supported Obsidian versions change.
- `SPEC.md`: update when a token, mapping, or component decision changes; never let it describe CSS that no longer exists.
- Don't add new doc files (CHANGELOG, CONTRIBUTING) unless asked; release notes live on GitHub releases.
