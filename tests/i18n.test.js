/*
 * Three languages, kept complete. Run with:  node tests/i18n.test.js
 *
 * The app shows every text in English, Amharic or Afaan Oromo. A key that is
 * missing in one language quietly falls back to English, and an empty string
 * shows nothing at all, so a patient could lose a warning without anyone
 * noticing. This reads the string tables (T, and the version 3 additions in
 * T2) from www/js/strings.js and fails if any language is missing a key, has an
 * empty text, has a list of a different length (symptoms, weekdays…), or
 * drops a placeholder such as {n} or {date} that English fills in. It also
 * checks that every key the page's markup asks for exists.
 * Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'www', 'index.html'), 'utf8');

// The tables are plain object literals in their own file: run it on its own
// and take them out, then merge them the way the page does at start-up (init()).
const strings = fs.readFileSync(path.join(__dirname, '..', 'www', 'js', 'strings.js'), 'utf8');
const { T, T2 } = vm.runInContext(strings + '\n;({ T, T2 })', vm.createContext({}));
if (!T || !T2) throw new Error('www/js/strings.js no longer defines T and T2');

const LANGS = ['en', 'am', 'or'];
// one flat table per language: top-level labels, plus runtime messages (msg)
// with the version 3 strings merged in, exactly as init() does
const table = {};
for (const l of LANGS) {
  const t = {};
  for (const [k, v] of Object.entries(T[l] || {})) if (k !== 'msg') t[k] = v;
  for (const [k, v] of Object.entries(Object.assign({}, T[l] && T[l].msg, T2[l]))) t['msg.' + k] = v;
  table[l] = t;
}
const allKeys = [...new Set(LANGS.flatMap(l => Object.keys(table[l])))].sort();

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
const list = a => a.slice(0, 6).join(' | ') + (a.length > 6 ? ` … and ${a.length - 6} more` : '');

check('the string tables were found', allKeys.length > 500, allKeys.length + ' keys');

for (const l of LANGS) {
  const missing = allKeys.filter(k => !(k in table[l]));
  check(`${l}: every key exists`, !missing.length, list(missing));
}

for (const l of LANGS) {
  const empty = Object.keys(table[l]).filter(k => {
    const v = table[l][k];
    // a list of numbers is data, not text
    if (Array.isArray(v)) return v.some(x => typeof x === 'string' ? !x.trim() : typeof x !== 'number');
    return typeof v !== 'string' || !v.trim();
  });
  check(`${l}: no empty texts`, !empty.length, list(empty));
}

const uneven = allKeys.filter(k => Array.isArray(table.en[k]) &&
  LANGS.some(l => !Array.isArray(table[l][k]) || table[l][k].length !== table.en[k].length));
check('lists have the same length in every language', !uneven.length, list(uneven));

// {n}, {date}, {name}… carry numbers and names into the sentence; a
// translation without one would silently drop, say, the number of doses
const holes = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
for (const l of ['am', 'or']) {
  const lost = allKeys.filter(k => typeof table.en[k] === 'string' && holes(table.en[k]) !== holes(table[l][k]));
  check(`${l}: same placeholders as English`, !lost.length, list(lost));
}

// data-t (text), data-tp (placeholder) and data-ta (aria-label) in the markup
const used = [...new Set([...html.matchAll(/data-t[pa]?="([^"]+)"/g)].map(m => m[1]))];
const unknown = used.filter(k => !(k in table.en) && !(('msg.' + k) in table.en));
check('every key the markup uses exists', used.length > 50 && !unknown.length, unknown.length ? list(unknown) : used.length + ' keys');

// confirm(), prompt() and alert() put their buttons in the phone's language,
// not the app's. The page asks in its own box, ask(), instead.
const script = html.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
const native = [...new Set(script.match(/(?<![\w.$])(?:window\.)?(?:confirm|prompt|alert)\s*\(/g) || [])];
check('questions are asked in the app\'s language, not with confirm() or prompt()', !native.length, native.join(' '));
// The phone camera can estimate a pulse. These two lines used to say the
// app measures nothing, which is no longer true. Each language must say
// the estimate is a wellness reading only, and must not deny measuring.
const DISCLAIMERS = ['t-disclaimer', 't-settingsAboutDisclaimer'];
const HONEST = {
  en: {
    must: [/not a medical device/i, /estimate your pulse with the phone camera/i, /wellness reading only/i, /does not diagnose/i, /follow your clinician/i],
    mustNot: [/does not measure/i, /measure your heart/i]
  },
  am: {
    must: [/የሕክምና መሣሪያ አይደለም/, /በስልክ ካሜራ/, /የልብ ምት/, /እንደ የጤንነት ንባብ ብቻ/, /ሊገምት ይችላል/, /በሽታ አይለይም/, /የሐኪምዎን መመሪያ ይከተሉ/],
    mustNot: [/አይለካም/]
  },
  or: {
    must: [/meeshaa yaalaa miti/i, /kaameraa bilbilaan/i, /rukuttaa onnee/i, /akka safartuu fayyummaa qofaatti/, /tilmaamuu danda'a/, /dhukkuba hin adda baasu/i, /qajeelfama doktora keetii hordofi/],
    mustNot: [/hin safaru/]
  }
};
for (const key of DISCLAIMERS) {
  for (const l of LANGS) {
    const text = String(table[l][key] || '');
    const missing = HONEST[l].must.filter(re => !re.test(text)).map(re => re.source);
    const banned = HONEST[l].mustNot.filter(re => re.test(text)).map(re => re.source);
    check(`${l} ${key}: camera pulse is a wellness estimate, not "does not measure"`, !missing.length && !banned.length,
      missing.length ? 'missing ' + missing.join('; ') : banned.length ? 'still says ' + banned.join('; ') : '');
  }
  const shown = html.match(new RegExp('data-t="' + key + '"[^>]*>([^<]*)<'));
  check(`page text for ${key} matches English`, !!(shown && shown[1] === table.en[key]));
}

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
