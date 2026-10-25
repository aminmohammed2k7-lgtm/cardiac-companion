/*
 * The plain look, kept plain. Run with:  node tests/look.test.js
 *
 * Reads the stylesheet and markup in index.html and fails if anything from
 * the old "app template" look comes back: pill-shaped or shadowed buttons,
 * gradients, press/lift motion, slide-in panels, all-caps labels, extra-bold
 * type, or text characters (✓ ↑ ↓ ×) used as icons instead of drawn ones.
 * It also checks that controls stay big enough to tap on a phone, that
 * sizes come from the type, spacing and radius scales in
 * docs/DESIGN-DECISIONS.md, and that text and field edges stay readable in
 * bright light.
 * Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'www', 'index.html'), 'utf8');
const css = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');

// every innermost rule: { sel, body }
const rules = [];
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) rules.push({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] });

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
const list = a => a.slice(0, 4).join(' | ') + (a.length > 4 ? ` … and ${a.length - 4} more` : '');
const where = (test) => rules.filter(test).map(r => r.sel);

// the only round shapes and shadows left: the unread dot on the bell and the range-slider thumb
const ROUND_OK = /^\.notif-dot$|range"?\]::-(webkit-slider|moz-range)-thumb$/;

let bad = where(r => /gradient\(/.test(r.body));
check('no gradients', !bad.length, list(bad));

bad = where(r => /border-radius\s*:\s*(999|[1-9]\d{2,})px|var\(--r-pill\)/.test(r.body));
check('no pill-shaped corners', !bad.length, list(bad));

bad = where(r => /border-radius\s*:\s*50%/.test(r.body) && !r.sel.split(',').every(s => ROUND_OK.test(s.trim())));
check('no round buttons or tags', !bad.length, list(bad));

bad = where(r => /box-shadow\s*:(?!\s*none)/.test(r.body) && !r.sel.split(',').every(s => ROUND_OK.test(s.trim())));
check('no shadows or glows', !bad.length, list(bad));

bad = where(r => /:(active|hover|focus)/.test(r.sel) && /transform\s*:/.test(r.body));
check('nothing moves under the finger or pointer', !bad.length, list(bad));

check('no keyframe animations', !/@keyframes/.test(css));
bad = where(r => /(^|;)\s*animation\s*:/.test(r.body) && !/\*/.test(r.sel));
check('nothing animates in', !bad.length, list(bad));

bad = where(r => /transition\s*:[^;]*\btransform\b/.test(r.body));
check('no transform transitions', !bad.length, list(bad));

bad = where(r => /text-transform\s*:\s*uppercase/.test(r.body));
check('no all-caps labels', !bad.length, list(bad));

bad = where(r => /font-weight\s*:\s*(800|900)/.test(r.body));
check('no extra-bold type (700 at most)', !bad.length, list(bad));

const root = (rules.find(r => r.sel === ':root') || { body: '' }).body;
const px = name => { const m = root.match(new RegExp(name + '\\s*:\\s*(\\d+)px')); return m ? +m[1] : 0; };
check('main buttons and fields are 48px on a phone', px('--ctl') >= 48, px('--ctl') + 'px');
check('small buttons and chips are 44px on a phone', px('--ctl-sm') >= 44, px('--ctl-sm') + 'px');
check('one corner radius, 8px', px('--r') === 8 && !/--r-(card|btn|tag)\s*:/.test(root), px('--r') + 'px');

// The scales in docs/DESIGN-DECISIONS.md. Every rule takes its sizes from
// them, so a one-off 15.5px or 14px gap cannot creep back in.
const outside = (prop, ok) => rules.filter(r => r.sel !== ':root')
  .flatMap(r => [...r.body.matchAll(new RegExp('(?:^|;)\\s*(' + prop + ')\\s*:([^;]*)', 'g'))]
    .filter(m => !ok(m[2].trim())).map(m => `${r.sel} { ${m[1]}:${m[2].trim()} }`));
const FS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'hero'];
check('seven type sizes', FS.every(k => px('--fs-' + k) > 0) && (root.match(/--fs-[\w]+\s*:/g) || []).length === FS.length,
  FS.map(k => px('--fs-' + k)).join(', '));
bad = outside('font-size', v => /^var\(--fs-(xs|sm|md|lg|xl|2xl|hero)\)$/.test(v));
check('every font size comes from the type scale', !bad.length, list(bad));
bad = outside('border-radius', v => v === 'var(--r)' || v === '0' || v === '50%');
check('every corner is the one radius, or square', !bad.length, list(bad));
// 0px is allowed: it is the fallback inside env(safe-area-inset-*, 0px)
bad = outside('padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|gap|row-gap|column-gap', v => !/(^|[^\w.])(?!0px)\d*\.?\d+px/.test(v));
check('every space comes from the spacing scale', !bad.length, list(bad));

// Read outside in bright sun: text at least 6:1 on the page and on cards,
// and the edges of fields and switches at least 3:1 (WCAG 1.4.11).
const hex = name => { const m = root.match(new RegExp(name + '\\s*:\\s*(#[0-9A-Fa-f]{6})')); return m ? m[1] : null; };
const lum = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255)
  .map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const inks = ['--ink-1', '--ink-2', '--ink-3'].flatMap(i => ['--canvas', '--surface'].map(bg => [i, bg, ratio(hex(i), hex(bg))]));
const weak = inks.filter(x => x[2] < 6);
check('text is at least 6:1 on the page and on cards', inks.length === 6 && !weak.length,
  weak.length ? weak.map(x => `${x[0]} on ${x[1]} ${x[2].toFixed(2)}:1`).join(', ') : 'lowest ' + Math.min(...inks.map(x => x[2])).toFixed(2) + ':1');
const edge = ratio(hex('--line-input'), hex('--surface'));
check('field and switch edges are at least 3:1', edge >= 3, edge.toFixed(2) + ':1');

const glyphs = [...new Set(html.match(/[✓✔✕✗↑↓]/g) || [])];
check('no text characters used as icons', !glyphs.length && !/>\s*×\s*</.test(html), glyphs.join(' '));

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
