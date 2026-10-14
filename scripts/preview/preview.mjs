#!/usr/bin/env node
// Basalt preview harness: renders HTML replicas of Obsidian's DOM for a few
// components with Obsidian's own app.css plus the built theme.css, and
// screenshots them in dark and light mode with Playwright.
//
// It is a replica, not the app: layout JS, the PixiJS graph, CodeMirror and
// plugins don't run. Use it to catch regressions between Obsidian checks.
//
// Usage:
//   node scripts/preview/preview.mjs <path/to/app.css> [options]
//   OBSIDIAN_APP_CSS=<path/to/app.css> node scripts/preview/preview.mjs [options]
//
// Options:
//   --theme <file>   built theme to load (default: theme.css at the repo root;
//                    env BASALT_THEME). Run scripts/build.sh first.
//   --out <dir>      output directory (default: preview-out/; env BASALT_PREVIEW_OUT)
//   --only <ids>     comma-separated fixture ids: tabbar,graph,find,notices,empty
//   --modes <list>   dark,light (default both)
//   --scale <n>      device scale factor (default 1)
//
// Needs Playwright, resolved from the global npm root (`npm root -g`), and a
// Chromium it can launch (set CHROMIUM_PATH to use a specific binary).

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FIXTURES } from "./fixtures.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

function die(msg) {
  console.error(`preview: error: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[++i];
      if (val === undefined) die(`missing value for ${a}`);
      opts[key] = val;
    } else opts.positional.push(a);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 23).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(0);
}

const appCss = path.resolve(opts.positional[0] ?? process.env.OBSIDIAN_APP_CSS ?? die("pass the path to Obsidian's app.css (argument or OBSIDIAN_APP_CSS)"));
const themeCss = path.resolve(opts.theme ?? process.env.BASALT_THEME ?? path.join(ROOT, "theme.css"));
const outDir = path.resolve(opts.out ?? process.env.BASALT_PREVIEW_OUT ?? path.join(ROOT, "preview-out"));
const modes = (opts.modes ?? "dark,light").split(",");
const scale = Number(opts.scale ?? 1);
const only = opts.only ? new Set(opts.only.split(",")) : null;

for (const [label, file] of [["app.css", appCss], ["theme", themeCss]]) {
  if (!fs.existsSync(file)) die(`${label} not found: ${file}`);
}
for (const m of modes) if (m !== "dark" && m !== "light") die(`unknown mode "${m}"`);
const fixtures = FIXTURES.filter((f) => !only || only.has(f.id));
if (only) for (const id of only) if (!FIXTURES.some((f) => f.id === id)) die(`unknown fixture "${id}"`);

function loadPlaywright() {
  const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  const require = createRequire(path.join(globalRoot, "noop.js"));
  try {
    return require("playwright");
  } catch {
    die(`Playwright not found under ${globalRoot}; install it globally (npm i -g playwright)`);
  }
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function pageHtml(fixture, mode) {
  const href = (f) => pathToFileURL(f).href;
  const frames = fixture.frames
    .map(
      (f, i) => `
    <div class="pv-frame-wrap" style="width:${f.width}px">
      <div class="pv-label">${String(i + 1).padStart(2, "0")} · ${esc(f.label)}</div>
      <div class="pv-frame${f.wrap ? " " + f.wrap : ""}" data-i="${i}" style="width:${f.width}px;height:${f.height}px">${f.html}</div>
    </div>`,
    )
    .join("");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${href(appCss)}">
<link rel="stylesheet" href="${href(themeCss)}">
<link rel="stylesheet" href="${href(path.join(HERE, "harness.css"))}">
</head>
<body class="pv-board theme-${mode} mod-macos is-focused is-frameless show-inline-title show-view-header styled-scrollbars" style="--zoom-factor: 1; --font-text-size: 16px;">
  <div class="pv-title">${esc(fixture.title)} · ${mode}</div>
  <div class="pv-note">Replica of Obsidian's DOM with app.css + ${esc(path.basename(themeCss))}. Not the real app.</div>
  <div class="pv-frames">${frames}</div>
  <script src="${href(path.join(HERE, "harness.js"))}"></script>
</body>
</html>`;
}

async function forceStates(cdp, fixture) {
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  for (const [i, frame] of fixture.frames.entries()) {
    for (const { sel, states } of frame.force ?? []) {
      const selector = `.pv-frame[data-i="${i}"] ${sel}`;
      const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector });
      if (!nodeIds.length) console.warn(`preview: warning: ${fixture.id} frame ${i + 1}: no match for "${sel}"`);
      for (const nodeId of nodeIds) {
        await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: states });
      }
    }
  }
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
fs.mkdirSync(outDir, { recursive: true });
const written = [];

try {
  for (const fixture of fixtures) {
    const dir = path.join(outDir, fixture.id);
    fs.mkdirSync(dir, { recursive: true });
    for (const mode of modes) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: scale });
      const page = await context.newPage();
      page.on("pageerror", (e) => console.warn(`preview: page error in ${fixture.id}/${mode}: ${e.message}`));
      const htmlFile = path.join(dir, `${mode}.html`);
      fs.writeFileSync(htmlFile, pageHtml(fixture, mode));
      await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.body.dataset.pvReady === "1");
      const cdp = await context.newCDPSession(page);
      await forceStates(cdp, fixture);

      const board = path.join(dir, `${mode}.png`);
      await page.screenshot({ path: board, fullPage: true });
      written.push(board);
      for (const i of fixture.frames.keys()) {
        const shot = path.join(dir, `${mode}-${String(i + 1).padStart(2, "0")}.png`);
        await page.locator(`.pv-frame[data-i="${i}"]`).screenshot({ path: shot });
        written.push(shot);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`preview: theme ${path.relative(ROOT, themeCss) || themeCss}`);
console.log(`preview: wrote ${written.length} screenshots to ${path.relative(ROOT, outDir) || outDir}/`);
