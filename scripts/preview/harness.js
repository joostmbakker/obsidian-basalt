// Runs inside the preview page. Draws an SVG stand-in for Obsidian's PixiJS
// graph using the colours and opacity Obsidian itself would read from the
// hidden ".graph-view.color-*" elements, and syncs the colour-group swatches
// to the .color-fill-N defaults. Layout and data are made up.
(function () {
  "use strict";

  const LAYOUTS = {
    global: {
      nodes: [
        ["Home", 0.42, 0.46, "fill"],
        ["Callouts", 0.24, 0.3, "fill"],
        ["Code and tables", 0.3, 0.66, "fill"],
        ["Typography", 0.55, 0.24, "fill"],
        ["Rem — From sensor data to the queue", 0.58, 0.62, "fill"],
        ["Pipeline.canvas", 0.12, 0.5, "attachment"],
        ["#idea", 0.18, 0.78, "tag"],
        ["Embeds", 0.46, 0.84, "fill"],
        ["Properties", 0.72, 0.42, "fill"],
        ["Lists and tasks", 0.12, 0.16, "fill"],
        ["Queue design", 0.66, 0.84, "unresolved"],
        ["#reading", 0.36, 0.12, "tag"],
        ["Library.base", 0.6, 0.06, "attachment"],
        ["Sensors", 0.76, 0.72, "fill"],
        ["Backlog", 0.06, 0.34, "unresolved"],
      ],
      edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 8], [1, 9], [1, 5], [2, 6], [2, 7], [4, 10], [4, 13], [3, 11], [3, 12], [1, 14], [4, 7], [8, 13], [9, 11]],
      groups: { 1: 2, 4: 1, 13: 1, 10: 1, 3: 3, 7: 2 },
    },
    local: {
      nodes: [
        ["Home", 0.5, 0.5, "focused"],
        ["Callouts", 0.24, 0.3, "fill"],
        ["Typography", 0.76, 0.28, "fill"],
        ["Rem — From sensor data…", 0.72, 0.74, "fill"],
        ["#idea", 0.26, 0.74, "tag"],
        ["Pipeline.canvas", 0.5, 0.14, "attachment"],
        ["Queue design", 0.5, 0.88, "unresolved"],
      ],
      edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [3, 6], [1, 4]],
      groups: {},
    },
  };

  function probe(root, cls) {
    const el = root.querySelector(".graph-view." + cls);
    if (!el) return { color: "magenta", opacity: 1 };
    const cs = getComputedStyle(el);
    return { color: cs.color, opacity: parseFloat(cs.opacity) || 1, font: cs.fontFamily };
  }

  function toHex(rgb) {
    const m = rgb.match(/[\d.]+/g);
    if (!m) return "#000000";
    return "#" + m.slice(0, 3).map((v) => Math.round(+v).toString(16).padStart(2, "0")).join("");
  }

  const NS = "http://www.w3.org/2000/svg";
  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function draw(host) {
    const root = host.parentElement;
    const layout = LAYOUTS[host.dataset.graph] || LAYOUTS.global;
    const hover = parseInt(host.dataset.hover, 10);
    const useGroups = host.dataset.groups === "true";
    const c = {};
    for (const k of ["fill", "fill-focused", "fill-tag", "fill-attachment", "fill-unresolved", "line", "text",
      "circle", "fill-highlight", "line-highlight", "fill-1", "fill-2", "fill-3", "fill-4", "fill-5", "fill-6"]) {
      c[k] = probe(root, "color-" + k);
    }

    const w = host.clientWidth, h = host.clientHeight;
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}` });
    const deg = layout.nodes.map(() => 0);
    layout.edges.forEach(([a, b]) => { deg[a]++; deg[b]++; });
    const near = new Set([hover]);
    layout.edges.forEach(([a, b]) => { if (a === hover) near.add(b); if (b === hover) near.add(a); });
    const fade = (i) => (hover >= 0 && !near.has(i) ? 0.25 : 1);
    const pos = (n) => [n[1] * w * 0.92 + w * 0.04, n[2] * h * 0.86 + h * 0.07];

    layout.edges.forEach(([a, b]) => {
      const [x1, y1] = pos(layout.nodes[a]);
      const [x2, y2] = pos(layout.nodes[b]);
      const hl = hover >= 0 && (a === hover || b === hover);
      const s = hl ? c["line-highlight"] : c.line;
      svg.appendChild(el("line", {
        x1, y1, x2, y2, stroke: s.color, "stroke-width": hl ? 1.5 : 1,
        opacity: s.opacity * (hover >= 0 && !hl ? 0.35 : 1),
      }));
    });

    layout.nodes.forEach((n, i) => {
      const [x, y] = pos(n);
      const r = 3.5 + Math.sqrt(deg[i]) * 2.2;
      let key = n[3] === "fill" ? "fill" : "fill-" + n[3];
      if (useGroups && layout.groups[i] && n[3] !== "unresolved") key = "fill-" + layout.groups[i];
      if (i === hover) key = "fill-highlight";
      const f = c[key];
      if (i === hover) {
        svg.appendChild(el("circle", { cx: x, cy: y, r: r + 4, fill: "none", stroke: c.circle.color, "stroke-width": 1.5, opacity: c.circle.opacity }));
      }
      svg.appendChild(el("circle", { cx: x, cy: y, r, fill: f.color, opacity: f.opacity * fade(i) }));
      const t = el("text", {
        x, y: y + r + 13, "text-anchor": "middle", fill: c.text.color,
        "font-size": 11.5, "font-family": c.text.font, opacity: c.text.opacity * fade(i),
      });
      t.textContent = n[0];
      svg.appendChild(t);
    });

    host.appendChild(svg);

    root.querySelectorAll('input[type="color"][data-group]').forEach((input) => {
      input.value = toHex(c["fill-" + input.dataset.group].color);
    });
  }

  document.querySelectorAll(".pv-graph").forEach(draw);
  document.body.dataset.pvReady = "1";
})();
