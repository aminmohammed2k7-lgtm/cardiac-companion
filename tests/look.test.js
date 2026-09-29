/*
 * The plain look, kept plain — run with:  node tests/look.test.js
 *
 * Reads the stylesheet and markup in index.html and fails if anything from
 * the old "app template" look comes back: pill-shaped or shadowed buttons,
 * gradients, press/lift motion, slide-in panels, all-caps labels, extra-bold
 * type, or text characters (✓ ↑ ↓ ×) used as icons instead of drawn ones.
 * It also checks that controls stay big enough to tap on a phone.
 * Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
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
check('button corners are 8px, card corners 12px', px('--r-btn') === 8 && px('--r-card') === 12, `${px('--r-btn')}px, ${px('--r-card')}px`);

const glyphs = [...new Set(html.match(/[✓✔✕✗↑↓]/g) || [])];
check('no text characters used as icons', !glyphs.length && !/>\s*×\s*</.test(html), glyphs.join(' '));

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
