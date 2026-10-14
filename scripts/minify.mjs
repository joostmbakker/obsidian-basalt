import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import postcss from 'postcss';
import litePreset from 'cssnano-preset-lite';

export async function minify(css) {
  const { plugins } = litePreset({
    // Leave all rules and declarations in cascade order, including empty rules.
    discardEmpty: false,
    discardComments: {
      remove: text => !/^\s*(?:!|Basalt — generated|@settings\b|doiuse-(?:disable|enable)\b)/u.test(text),
    },
  });
  const active = plugins.filter(([, options]) => !options.exclude)
    .map(([plugin, options]) => plugin(options));
  const result = await postcss(active).process(css, { from: undefined, map: false });
  return result.css.trimEnd() + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const path = process.argv[2];
    if (!path) throw new Error('Usage: node scripts/minify.mjs <assembled-css>');
    // Only replace the temporary build file after parsing and minification succeed.
    await writeFile(path, await minify(await readFile(path, 'utf8')));
  } catch (error) {
    // PostCSS errors otherwise dump the whole stylesheet, including embedded fonts.
    console.error(`minify: ${error.reason ?? error.message}${error.line ? ` (line ${error.line})` : ''}`);
    process.exitCode = 1;
  }
}
