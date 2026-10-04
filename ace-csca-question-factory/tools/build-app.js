'use strict';
/* Builds the browser app from app/app.html:
     dist/app/csca-question-factory.html   one self-contained file (engine + KaTeX inside) — open it from disk, no server needed
     dist/app/artifact.html                the same page as page content only (KaTeX script from cdnjs) for hosted publishing
     dist/question-factory.js              the engine as one script for the website (also .min.js when esbuild is available)
   KaTeX (css + fonts + js) is taken from node_modules when present; without it the page still works and shows formulas as MathML. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const QF = require('../src/index.js');

function findPkg(name) {
  const tries = [() => path.dirname(require.resolve(name + '/package.json')), () => path.join('/opt/npm-tools/node_modules', name)];
  for (const t of tries) { try { const d = t(); if (fs.existsSync(path.join(d, 'package.json'))) return d; } catch (e) { /* next */ } }
  return null;
}
function safeScript(js) { return js.replace(/<\/script/gi, '<\\/script'); }

/* ---- engine bundle ---- */
const banner = '/* ACE CSCA Question Factory — browser bundle. Defines window.QF; call QF.adapters.install() to register ACE_GEN. */\n';
let bundle = banner + QF.FILES.filter(f => fs.existsSync(path.join(ROOT, 'src', f))).map(f => '/* ---- ' + f + ' ---- */\n' + fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n');
fs.mkdirSync(path.join(ROOT, 'dist', 'app'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'question-factory.js'), bundle);
let min = bundle;
const esbuildDir = findPkg('esbuild');
if (esbuildDir) {
  try {
    min = banner + require(esbuildDir).transformSync(bundle, { minify: true, target: 'es2015', charset: 'utf8', legalComments: 'none' }).code;
    fs.writeFileSync(path.join(ROOT, 'dist', 'question-factory.min.js'), min);
  } catch (e) { console.log('esbuild failed, using the unminified bundle: ' + e.message.split('\n')[0]); min = bundle; }
}

/* ---- KaTeX: stylesheet with the fonts inside, and the script ---- */
const katexDir = findPkg('katex');
let katexCss = '', katexJs = null, katexVersion = '0.16.47';
if (katexDir) {
  katexVersion = JSON.parse(fs.readFileSync(path.join(katexDir, 'package.json'), 'utf8')).version;
  const KEEP = ['KaTeX_AMS-Regular', 'KaTeX_Main-Bold', 'KaTeX_Main-BoldItalic', 'KaTeX_Main-Italic', 'KaTeX_Main-Regular', 'KaTeX_Math-BoldItalic', 'KaTeX_Math-Italic', 'KaTeX_Size1-Regular', 'KaTeX_Size2-Regular', 'KaTeX_Size3-Regular', 'KaTeX_Size4-Regular'];
  katexCss = fs.readFileSync(path.join(katexDir, 'dist', 'katex.min.css'), 'utf8').replace(/@font-face\{[^}]*\}/g, block => {
    const m = /url\(fonts\/(KaTeX_[\w-]+)\.woff2\)/.exec(block);
    if (!m || KEEP.indexOf(m[1]) < 0) return '';                       // faces the questions never use
    const data = fs.readFileSync(path.join(katexDir, 'dist', 'fonts', m[1] + '.woff2')).toString('base64');
    return block.replace(/src:[^;}]+/, 'src:url(data:font/woff2;base64,' + data + ') format("woff2")');
  });
  katexJs = fs.readFileSync(path.join(katexDir, 'dist', 'katex.min.js'), 'utf8');
} else console.log('KaTeX not found in node_modules: formulas will be shown as MathML and the script will load from cdnjs.');

/* ---- pages ---- */
const tpl = fs.readFileSync(path.join(ROOT, 'app', 'app.html'), 'utf8');
function page(katexTag) {
  let h = tpl.split('/*@KATEX_CSS*/').join(katexCss);
  h = h.split('<!--@KATEX_JS-->').join(katexTag);
  h = h.split('<!--@QF_BUNDLE-->').join('<script>\n' + safeScript(min) + '\n</script>');
  return h;
}
const cdn = '<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/' + katexVersion + '/katex.min.js"></script>';
const artifact = page(cdn);
fs.writeFileSync(path.join(ROOT, 'dist', 'app', 'artifact.html'), artifact);
const local = page(katexJs ? '<script>\n' + safeScript(katexJs) + '\n</script>' : cdn);
const cut = local.indexOf('<header class="top">');
const standalone = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + local.slice(0, cut) + '</head>\n<body>\n' + local.slice(cut) + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(ROOT, 'dist', 'app', 'csca-question-factory.html'), standalone);
const kb = f => Math.round(fs.statSync(path.join(ROOT, 'dist', f)).size / 1024) + ' KB';
console.log('engine   dist/question-factory.js ' + kb('question-factory.js') + (esbuildDir && min !== bundle ? ' · dist/question-factory.min.js ' + kb('question-factory.min.js') : ''));
console.log('app      dist/app/csca-question-factory.html ' + kb('app/csca-question-factory.html') + ' (self-contained)');
console.log('         dist/app/artifact.html ' + kb('app/artifact.html') + ' (page content, KaTeX ' + katexVersion + ' from cdnjs)');
