#!/usr/bin/env node
/**
 * Render the demo diagrams to SVG with the vendored Pele engine and wrap them
 * in HTML shells that carry the plugin's theme bridge with concrete colors, so
 * Chrome headless can screenshot them for the README. Committed so
 * contributors can regenerate screenshots after a Pele upgrade.
 *
 *   node assets/render-demos.mjs            # light theme
 *   node assets/render-demos.mjs --dark     # dark theme (suffix .dark)
 *
 * Then rasterize the generated HTML shells, e.g.:
 *   "Google Chrome" --headless=new --screenshot=out.png \
 *     --window-size=1000xH --hide-scrollbars assets/demos/build/<name>.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const SRC = join(here, 'demos');
const OUT = join(here, 'demos', 'build');
const DARK = process.argv.includes('--dark');

const vendor = readFileSync(join(root, 'lib', 'vendor', 'pele.global.js'), 'utf8');
runInThisContext(vendor + '\nglobalThis.__PELE__ = pele;', { filename: 'pele.global.js' });
const pele = globalThis.__PELE__;

// Concrete stand-ins for the DSH design aliases, used only for screenshots;
// at runtime the bridge resolves against the live theme.
const P = DARK
  ? { fg: '#d7dde3', accent: '#6b96ff', surface: '#1d2126', border: '#3a4148', bg: '#16181c' }
  : { fg: '#25292e', accent: '#4a72f5', surface: '#f6f8fa', border: '#d4d9de', bg: '#ffffff' };

const css = `
:root{color-scheme:${DARK ? 'dark' : 'light'}}
body{margin:0;background:${P.bg};display:flex;justify-content:center}
#stage{width:960px;padding:28px 32px;background:${P.bg};box-sizing:border-box;
  --pele-fg:${P.fg};--pele-line:${P.accent};--pele-accent:${P.accent};
  --pele-surface:${P.surface};--pele-border:${P.border};--pele-bg:${P.bg};
  color:${P.fg};font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif}
#stage svg{max-width:100%;height:auto;display:block;margin:0 auto}
#stage svg text,#stage svg tspan{font-family:inherit}
`;

mkdirSync(OUT, { recursive: true });
const sources = [
  'request-loop.flow.mmd',
  'order-sequence.seq.mmd',
  'plugin-architecture.arch.mmd',
  'degradation-gates.state.mmd',
  'diagram-matrix.pie.mmd',
];
let failures = 0;
for (const name of sources) {
  const source = readFileSync(join(SRC, name), 'utf8');
  let svg = '';
  try {
    const result = pele.render(source);
    svg = result && typeof result.svg === 'string' ? result.svg : '';
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    failures++;
    continue;
  }
  if (!svg.trim()) {
    console.error(`FAIL ${name}: empty SVG`);
    failures++;
    continue;
  }
  const aspect = Number((svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/) ?? [])[2] ?? 0);
  const width = Number((svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/) ?? [])[1] ?? 0);
  const html = `<!doctype html><meta charset="utf-8"><style>${css}</style><div id="stage">${svg}</div>`;
  const outName = basename(name, '.mmd') + (DARK ? '.dark' : '') + '.svg';
  writeFileSync(join(OUT, outName), svg);
  writeFileSync(join(OUT, basename(name, '.mmd') + (DARK ? '.dark' : '') + '.html'), html);
  const px = aspect > 0 ? Math.round(1024 * (aspect / width)) + 96 : 720;
  console.log(`OK ${outName} viewBox=${width}x${aspect} suggested-window=1040x${px}`);
}
process.exit(failures ? 1 : 0);
