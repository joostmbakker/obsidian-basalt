import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { minify } from './minify.mjs';

// Compare parsed content and order, ignoring only comments and formatting.
function content(css) {
  function visit(node) {
    if (node.type === 'comment') return null;
    const result = { type: node.type };
    for (const key of ['selector', 'prop', 'value', 'important', 'name', 'params']) {
      if (node[key] !== undefined) result[key] = node[key];
    }
    if (node.nodes) result.nodes = node.nodes.map(visit).filter(Boolean);
    return result;
  }
  return visit(postcss.parse(css));
}

test('reduce size while preserving CSS content and functional comments', async () => {
  const css = `/* Basalt — generated. Font copyright and OFL licence. */
/* ordinary explanation */
/* @settings\nname: Basalt\nsettings:\n  - id: tab-style\n    type: class-select\n*/
@font-face {
  font-family: "Fixture";
  src: url("data:font/woff2;base64,AAECAwQ=") format("woff2");
}
/* doiuse-disable text-decoration */
.link { text-decoration-color: currentColor; }
/* doiuse-enable text-decoration */
.link { --label: "two  spaces"; color: red; color: var(--accent); }
.link:hover { color: blue; }
@container pane (min-width: 231px) { .link { display: none; } }
`;
  const output = await minify(css);
  assert.ok(Buffer.byteLength(output) < Buffer.byteLength(css));
  assert.deepEqual(content(output), content(css));
  assert.ok(!output.includes('ordinary explanation'));
  const comments = text => [...postcss.parse(text).nodes]
    .filter(node => node.type === 'comment').map(node => node.text);
  assert.deepEqual(comments(output), comments(css).filter(c => c !== 'ordinary explanation'));
  assert.ok(output.indexOf('doiuse-disable') < output.indexOf('text-decoration-color'));
  assert.ok(output.indexOf('doiuse-enable') > output.indexOf('text-decoration-color'));
  assert.equal(await minify(output), output);
});

test('reject malformed CSS instead of producing a release file', async () => {
  await assert.rejects(minify('.link { color: red;'));
});
