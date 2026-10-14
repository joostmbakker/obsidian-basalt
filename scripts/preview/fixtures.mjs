// HTML fixtures that reproduce Obsidian's DOM for the components Basalt styles.
// Class names and nesting come from the selectors in Obsidian's app.css.
// Where app.css does not pin the markup down, the fixture is a guess and says
// so in a "GUESS:" comment next to it.
//
// A fixture is { id, title, frames: [{ label, width, height, wrap?, html, force? }] }.
//   wrap   extra classes on the frame (e.g. a basalt-tabs-* style class; those
//          rules use a descendant selector, so a wrapper stands in for <body>)
//   force  [{ sel, states }] pseudo-classes forced through CDP CSS.forcePseudoState
//          (sel is scoped to the frame; states e.g. ["hover"], ["focus", "focus-visible"])

import { icon } from "./icons.mjs";

/* ------------------------------------------------------------------------ */
/* Shared shells                                                             */
/* ------------------------------------------------------------------------ */

// Root split with one tab group; the leaf content goes in `content`.
function rootLeaf({ type, title, content, tabs = [title], headerHtml }) {
  const tabHeaders = tabs
    .map(
      (t, i) => `
      <div class="workspace-tab-header tappable${i === 0 ? " is-active mod-active" : ""}" aria-label="${t}">
        <div class="workspace-tab-header-inner">
          <div class="workspace-tab-header-inner-icon">${icon("file-text")}</div>
          <div class="workspace-tab-header-inner-title">${t}</div>
          <div class="workspace-tab-header-status-container"></div>
          <div class="workspace-tab-header-inner-close-button" aria-label="Close">${icon("x")}</div>
        </div>
      </div>`,
    )
    .join("");
  return `
  <div class="workspace-split mod-vertical mod-root">
    <div class="workspace-tabs mod-top mod-active">
      <div class="workspace-tab-header-container">
        <div class="workspace-tab-header-container-inner">${tabHeaders}</div>
        <div class="workspace-tab-header-new-tab"><span class="clickable-icon" aria-label="New tab">${icon("plus")}</span></div>
        <div class="workspace-tab-header-spacer"></div>
        <div class="workspace-tab-header-tab-list"><span class="clickable-icon">${icon("chevron-down")}</span></div>
      </div>
      <div class="workspace-tab-container">
        <div class="workspace-leaf mod-active">
          <div class="workspace-leaf-content" data-type="${type}">
            ${headerHtml ?? viewHeader(title)}
            ${content}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function viewHeader(title) {
  return `
    <div class="view-header">
      <div class="view-header-title-container mod-at-start">
        <div class="view-header-title">${title}</div>
      </div>
      <div class="view-actions"></div>
    </div>`;
}

// Right sidebar with one leaf (local graph lives here by default).
function sideLeaf({ type, content }) {
  return `
  <div class="workspace-split mod-horizontal mod-sidedock mod-right-split">
    <div class="workspace-tabs mod-top">
      <div class="workspace-tab-container">
        <div class="workspace-leaf mod-active">
          <div class="workspace-leaf-content" data-type="${type}">
            <div class="view-content">${content}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------------ */
/* Tab bar                                                                   */
/* ------------------------------------------------------------------------ */

const tabStyles = [
  ["", "Built-in default (no plugin)"],
  ["basalt-tabs-default", "Obsidian (explicit)"],
  ["basalt-tabs-underline", "Underline"],
  ["basalt-tabs-track", "Track"],
  ["basalt-tabs-ink", "Ink"],
  ["basalt-tabs-sheet", "Sheet"],
  ["basalt-tabs-indexed", "Indexed"],
];

const tabbar = {
  id: "tabbar",
  title: "Tab bar",
  frames: tabStyles.map(([cls, label]) => ({
    label: `${label} · 2nd tab hover`,
    width: 640,
    height: 96,
    wrap: cls,
    html: rootLeaf({
      type: "markdown",
      title: "Home",
      tabs: ["Home", "Callouts", "Code and tables"],
      content: '<div class="view-content"></div>',
    }),
    force: [{ sel: ".workspace-tab-header:nth-child(2)", states: ["hover"] }],
  })),
};

/* ------------------------------------------------------------------------ */
/* Graph view                                                                */
/* ------------------------------------------------------------------------ */

// Obsidian draws the graph with PixiJS on a <canvas> and reads its colours
// (and opacity) from hidden ".graph-view.color-*" elements via getComputedStyle.
// The harness keeps those probe elements and draws an SVG stand-in with the
// computed values (harness.js). GUESS: the probes' exact parent element.
const GRAPH_PROBES = [
  "color-fill", "color-fill-focused", "color-fill-tag", "color-fill-attachment",
  "color-fill-unresolved", "color-arrow", "color-circle", "color-line", "color-text",
  "color-fill-highlight", "color-line-highlight",
  "color-fill-1", "color-fill-2", "color-fill-3", "color-fill-4", "color-fill-5", "color-fill-6",
]
  .map((c) => `<div class="graph-view ${c}" style="display:none"></div>`)
  .join("");

function section(mod, title, children, { collapsed = false } = {}) {
  return `
    <div class="tree-item graph-control-section mod-${mod}${collapsed ? " is-collapsed" : ""}">
      <div class="tree-item-self mod-collapsible">
        <div class="tree-item-icon collapse-icon${collapsed ? " is-collapsed" : ""}">${icon("right-triangle")}</div>
        <div class="tree-item-inner"><header class="graph-control-section-header">${title}</header></div>
      </div>
      ${collapsed ? "" : `<div class="tree-item-children">${children}</div>`}
    </div>`;
}

function toggle(name, on) {
  return `
    <div class="setting-item mod-toggle">
      <div class="setting-item-info"><div class="setting-item-name">${name}</div><div class="setting-item-description"></div></div>
      <div class="setting-item-control"><div class="checkbox-container${on ? " is-enabled" : ""}"><input type="checkbox" tabindex="0"></div></div>
    </div>`;
}

// GUESS: Obsidian's JS keeps --slider-fill-ratio in sync inline; set it once here.
function slider(name, value, min = 0, max = 1) {
  return `
    <div class="setting-item mod-slider">
      <div class="setting-item-info"><div class="setting-item-name">${name}</div><div class="setting-item-description"></div></div>
      <div class="setting-item-control"><input class="slider" type="range" min="${min}" max="${max}" step="any" value="${value}" style="--slider-fill-ratio: ${(value - min) / (max - min)}"></div>
    </div>`;
}

function searchSetting(placeholder, value = "") {
  return `
    <div class="setting-item mod-search-setting">
      <div class="setting-item-info"><div class="setting-item-name"></div><div class="setting-item-description"></div></div>
      <div class="setting-item-control">
        <div class="search-input-container">
          <input enterkeyhint="search" type="search" spellcheck="false" placeholder="${placeholder}" value="${value}">
          <div class="search-input-clear-button"></div>
        </div>
      </div>
    </div>`;
}

// GUESS: color-group row markup (text input, colour input, delete icon) from
// the .graph-color-group rules; the colour input value is synced to the
// matching .color-fill-N probe by harness.js (data-group).
function colorGroup(query, n) {
  return `
    <div class="graph-color-group">
      <input type="text" spellcheck="false" placeholder="Enter query..." value="${query}">
      <input type="color" data-group="${n}">
      <div class="clickable-icon" aria-label="Delete group">${icon("x")}</div>
    </div>`;
}

const groupsChildren = `
  <div class="graph-color-groups-container">
    ${colorGroup("path:Projects", 1)}
    ${colorGroup("tag:#idea", 2)}
    ${colorGroup("tag:#reading", 3)}
  </div>
  <div class="graph-color-button-container"><button class="mod-cta">New group</button></div>`;

function graphControls({ local = false, closed = false, collapsedForces = true } = {}) {
  const filters = local
    ? searchSetting("Search files...") +
      slider("Depth", 0.4, 0, 1) +
      toggle("Incoming links", true) +
      toggle("Outgoing links", true) +
      toggle("Neighbor links", false) +
      toggle("Tags", false) +
      toggle("Attachments", false)
    : searchSetting("Search files...", "path:Projects") +
      toggle("Tags", true) +
      toggle("Attachments", false) +
      toggle("Existing files only", true) +
      toggle("Orphans", true);
  const display =
    toggle("Arrows", false) +
    slider("Text fade threshold", 0.5) +
    slider("Node size", 0.3) +
    slider("Link thickness", 0.25) +
    // GUESS: Animate sits at the end of Display as a CTA button.
    `<button class="mod-cta">Animate</button>`;
  const forces = slider("Center force", 0.5) + slider("Repel force", 0.6) + slider("Link force", 0.8) + slider("Link distance", 0.4);
  return `
    <div class="graph-controls${closed ? " is-close" : ""}">
      ${section("filter", "Filters", filters)}
      ${section("color-groups", "Groups", groupsChildren)}
      ${section("display", "Display", display)}
      ${section("forces", "Forces", forces, { collapsed: collapsedForces })}
      <div class="clickable-icon graph-controls-button mod-close" aria-label="Close">${icon("x")}</div>
      <div class="clickable-icon graph-controls-button mod-reset" aria-label="Restore default settings">${icon("rotate-ccw")}</div>
      <div class="clickable-icon graph-controls-button mod-open" aria-label="Open graph settings">${icon("settings")}</div>
      <div class="clickable-icon graph-controls-button mod-animate" aria-label="Animate">${icon("wand-2")}</div>
    </div>`;
}

// data-graph = layout seed, data-hover = index of hovered node (or -1),
// data-groups = colour nodes by group (1-6).
function graphCanvas({ kind, hover = -1, groups = false }) {
  return `${GRAPH_PROBES}<div class="pv-graph" data-graph="${kind}" data-hover="${hover}" data-groups="${groups}"></div>`;
}

const graph = {
  id: "graph",
  title: "Graph view",
  frames: [
    {
      label: "Global · controls open",
      width: 900,
      height: 760,
      html: rootLeaf({
        type: "graph",
        title: "Graph view",
        content: `<div class="view-content">${graphCanvas({ kind: "global", groups: true })}${graphControls()}</div>`,
      }),
    },
    {
      label: "Global · node hover (fill/line highlight, circle)",
      width: 900,
      height: 520,
      html: rootLeaf({
        type: "graph",
        title: "Graph view",
        content: `<div class="view-content">${graphCanvas({ kind: "global", hover: 2, groups: true })}${graphControls({ closed: true })}</div>`,
      }),
    },
    {
      label: "Controls · states: close hover, header hover, input focus, toggle focus, button hover, delete hover",
      width: 900,
      height: 760,
      html: rootLeaf({
        type: "graph",
        title: "Graph view",
        content: `<div class="view-content">${graphCanvas({ kind: "global", groups: true })}${graphControls()}</div>`,
      }),
      force: [
        { sel: ".graph-controls-button.mod-close", states: ["hover"] },
        { sel: ".graph-control-section.mod-display > .tree-item-self", states: ["hover"] },
        { sel: ".graph-color-group:nth-child(2) input[type=text]", states: ["focus", "focus-visible"] },
        { sel: ".mod-filter .setting-item.mod-toggle:nth-of-type(3) input[type=checkbox]", states: ["focus", "focus-visible"] },
        { sel: ".graph-color-button-container button", states: ["hover"] },
        { sel: ".graph-color-group:nth-child(3) .clickable-icon", states: ["hover"] },
        { sel: ".graph-control-section.mod-forces > .tree-item-self", states: ["focus", "focus-visible"] },
      ],
    },
    {
      label: "Local (sidebar) · controls closed, open-button hover",
      width: 320,
      height: 420,
      html: sideLeaf({ type: "localgraph", content: graphCanvas({ kind: "local", hover: -1 }) + graphControls({ local: true, closed: true }) }),
      force: [{ sel: ".graph-controls-button.mod-open", states: ["hover"] }],
    },
    {
      label: "Local (sidebar) · controls open, slider hover",
      width: 320,
      height: 720,
      html: sideLeaf({ type: "localgraph", content: graphCanvas({ kind: "local", hover: 1 }) + graphControls({ local: true }) }),
      force: [{ sel: ".mod-filter .setting-item.mod-slider input", states: ["hover"] }],
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* Find & replace bar                                                        */
/* ------------------------------------------------------------------------ */

// GUESS: button set and order (previous, next, replace toggle, close) and the
// text buttons in the replace row; app.css only styles the containers,
// .document-search-button and .document-search-count.
function findBar({ replace = false, query = "", count = "", noMatch = false, replaceValue = "" } = {}) {
  return `
    <div class="document-search-container${replace ? " mod-replace-mode" : ""}">
      <div class="document-search">
        <div class="search-input-container document-search-input${noMatch ? " mod-no-match" : ""}">
          <input enterkeyhint="search" type="search" spellcheck="false" placeholder="Find..." value="${query}">
          <div class="search-input-clear-button"></div>
          ${count ? `<div class="document-search-count">${count}</div>` : ""}
        </div>
        <div class="document-search-buttons">
          <button class="clickable-icon document-search-button" aria-label="Previous">${icon("arrow-up")}</button>
          <button class="clickable-icon document-search-button" aria-label="Next">${icon("arrow-down")}</button>
          <button class="clickable-icon document-search-button${replace ? " is-active" : ""}" aria-label="Replace">${icon("replace")}</button>
          <button class="clickable-icon document-search-close-button" aria-label="Exit search">${icon("x")}</button>
        </div>
      </div>
      <div class="document-replace">
        <input class="document-replace-input" type="text" spellcheck="false" placeholder="Replace..." value="${replaceValue}">
        <div class="document-replace-buttons">
          <button class="document-search-button">Replace</button>
          <button class="document-search-button">Replace all</button>
        </div>
      </div>
    </div>`;
}

// Editor body: CodeMirror lines. GUESS: the current match carries
// cm-highlight + obsidian-search-match-highlight, others only the latter.
function editorBody({ live, matches = true }) {
  const m = (t, current) =>
    matches ? `<span class="${current ? "cm-highlight " : ""}obsidian-search-match-highlight">${t}</span>` : t;
  return `
    <div class="cm-editor ͼ1 ͼ2">
      <div class="cm-scroller">
        <div class="cm-sizer">
          <div class="cm-contentContainer">
            <div class="cm-content" contenteditable="true">
              <div class="cm-line HyperMD-header HyperMD-header-2"><span class="cm-header cm-header-2">${live ? "" : '<span class="cm-formatting cm-formatting-header cm-formatting-header-2 cm-header cm-header-2">## </span>'}Sensor ${m("pipeline")}</span></div>
              <div class="cm-line">Readings arrive every second and enter the ${m("pipeline", true)} through a bounded queue,</div>
              <div class="cm-line">so a slow consumer never blocks the sensor. Each ${m("pipeline")} stage owns one buffer.</div>
              <div class="cm-line"><br></div>
              <div class="cm-line">See <span class="cm-hmd-internal-link"><span class="cm-underline">Rem — From sensor data to the queue</span></span> for the full ${m("pipeline")}.</div>
            </div>
          </div>
        </div>
      </div>
    </div>`.replace(/>\s+</g, "><"); // .cm-content is pre-wrap: no template whitespace
}

function sourceView({ live, bar }) {
  // .is-searching flips the view to column-reverse, so the bar comes last in
  // the DOM and renders on top (see app.css "Moves search to the top").
  return `
    <div class="view-content">
      <div class="markdown-source-view cm-s-obsidian mod-cm6 node-insert-event is-readable-line-width${live ? " is-live-preview" : ""} is-searching${bar.includes("mod-replace-mode") ? " is-replacing" : ""}">
        ${editorBody({ live, matches: !bar.includes("mod-no-match") })}
        ${bar}
      </div>
    </div>`;
}

const findFrame = (label, live, barOpts, force = []) => ({
  label,
  width: 820,
  height: barOpts.replace ? 440 : 400,
  html: rootLeaf({ type: "markdown", title: "Pipeline notes", content: sourceView({ live, bar: findBar(barOpts) }) }),
  force,
});

const find = {
  id: "find",
  title: "Find & replace",
  frames: [
    findFrame("Live preview · find, input focused", true, { query: "pipeline", count: "2 / 4" }, [
      { sel: ".document-search-input input", states: ["focus", "focus-visible"] },
    ]),
    findFrame("Live preview · replace mode, next hover", true, { replace: true, query: "pipeline", count: "2 / 4", replaceValue: "flow" }, [
      { sel: ".document-search-buttons .document-search-button:nth-child(2)", states: ["hover"] },
    ]),
    findFrame("Live preview · no match", true, { query: "pipline", count: "0 / 0", noMatch: true }),
    findFrame("Source mode · replace mode, Replace all hover, replace input focus", false, { replace: true, query: "pipeline", count: "2 / 4" }, [
      { sel: ".document-replace-buttons button:nth-child(2)", states: ["hover"] },
      { sel: ".document-replace-input", states: ["focus", "focus-visible"] },
    ]),
    findFrame("Source mode · empty, close hover, Replace focus-visible", false, { replace: true }, [
      { sel: ".document-search-close-button", states: ["hover"] },
      { sel: ".document-replace-buttons button:nth-child(1)", states: ["focus", "focus-visible"] },
    ]),
  ],
};

/* ------------------------------------------------------------------------ */
/* Notices                                                                   */
/* ------------------------------------------------------------------------ */

// GUESS: notice inner markup. app.css styles .notice itself (text is a direct
// child or a wrapper), .notice-button-container and .notice-cta.
function notices(list) {
  return `<div class="notice-container">${list.join("")}</div>`;
}
const N = {
  plain: `<div class="notice">Copied link to clipboard</div>`,
  long: `<div class="notice">"Rem — From sensor data to the queue" was moved to Projects/Sensors. 3 links were updated.</div>`,
  cta: `<div class="notice">Note moved to trash<div class="notice-button-container"><a class="notice-cta">Undo</a><a class="notice-cta">Open trash</a></div></div>`,
  loading: `<div class="notice is-loading">Indexing vault… 412 / 1,280 files<progress value="0.32" max="1"></progress></div>`,
};

const noticeFrame = (label, list, force = []) => ({
  label,
  width: 380,
  height: 330,
  html: `<div class="pv-notice-host">${notices(list)}</div>`,
  force,
});

const notice = {
  id: "notices",
  title: "Notices",
  frames: [
    noticeFrame("Stack: plain, long, CTA, loading", [N.plain, N.long, N.cta, N.loading]),
    noticeFrame("Hover: notice + CTA", [N.plain, N.cta], [
      { sel: ".notice:nth-child(2)", states: ["hover"] },
      { sel: ".notice-cta:first-child", states: ["hover"] },
    ]),
    noticeFrame("Focus-visible on CTA", [N.cta], [{ sel: ".notice-cta:first-child", states: ["focus", "focus-visible"] }]),
  ],
};

/* ------------------------------------------------------------------------ */
/* Empty state                                                               */
/* ------------------------------------------------------------------------ */

// Markup taken from Obsidian 1.14's live DOM: each action is a
// .text-icon-button.mod-pill.empty-state-action with icon, label and optional
// hotkey spans; the title element is created empty. Icons are stand-ins for the
// lucide glyphs.
const emptyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><rect x="4" y="3" width="16" height="18" rx="2"/></svg>`;
const emptyAction = (label, hotkey = "") =>
  `<div class="text-icon-button tappable mod-pill empty-state-action" tabindex="0" role="button" aria-label="${label}">` +
  `<span class="text-button-icon">${emptyIcon}</span>` +
  `<span class="text-button-label">${label}</span>` +
  (hotkey ? `<span class="empty-state-hotkey"> ${hotkey}</span>` : "") +
  `</div>`;
const emptyState = `
  <div class="view-content">
    <div class="empty-state">
      <div class="empty-state-container">
        <div class="empty-state-title"></div>
        <div class="empty-state-action-list">
          ${emptyAction("New note", "⌘ N")}
          ${emptyAction("New base")}
          ${emptyAction("New canvas")}
          ${emptyAction("Go to file", "⌘ O")}
        </div>
      </div>
    </div>
  </div>`;

const emptyFrame = (label, width, force = []) => ({
  label,
  width,
  height: 460,
  html: rootLeaf({ type: "empty", title: "New tab", content: emptyState }),
  force,
});

const empty = {
  id: "empty",
  title: "Empty state",
  frames: [
    emptyFrame("New tab · default", 720),
    emptyFrame("Hover 1st, focus-visible 4th", 720, [
      { sel: ".empty-state-action:nth-child(1)", states: ["hover"] },
      { sel: ".empty-state-action:nth-child(4)", states: ["focus", "focus-visible"] },
    ]),
    emptyFrame("Narrow pane", 220),
  ],
};

export const FIXTURES = [tabbar, graph, find, notice, empty];
