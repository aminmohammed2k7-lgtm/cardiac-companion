/*
 * Static demo of the current app — run with:  npm run build:web
 *
 * Copies www/ to dist/ and adds the browser fallback (tools/web-demo/
 * browser.js) plus a favicon. The Android app keeps using www/ as it
 * stands; this does not touch capacitor.config.json or vercel.json,
 * and it does not deploy.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// A .ico that wraps the PNG. Browsers request /favicon.ico before they
// read the page; an empty response is a console error on every load.
function pngAsIco(png) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(0, 6); // 0 means 256 in the ICO directory
  header.writeUInt8(0, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

function countFiles(dir) {
  let n = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) n += countFiles(path.join(dir, ent.name));
    else if (ent.isFile()) n++;
  }
  return n;
}

function buildWeb(options) {
  const www = (options && options.www) || path.join(root, 'www');
  const dist = (options && options.dist) || path.join(root, 'dist');
  const iconPath = path.join(root, 'tools', 'icons', 'icon-512.png');
  const browserSrc = path.join(root, 'tools', 'web-demo', 'browser.js');

  if (!fs.existsSync(path.join(www, 'index.html'))) throw new Error('missing ' + path.join(www, 'index.html'));
  if (!fs.existsSync(iconPath)) throw new Error('missing ' + iconPath);
  if (!fs.existsSync(browserSrc)) throw new Error('missing ' + browserSrc);

  fs.rmSync(dist, { recursive: true, force: true });
  fs.cpSync(www, dist, { recursive: true });

  const png = fs.readFileSync(iconPath);
  fs.writeFileSync(path.join(dist, 'favicon.png'), png);
  fs.writeFileSync(path.join(dist, 'favicon.ico'), pngAsIco(png));
  fs.copyFileSync(browserSrc, path.join(dist, 'js', 'platform', 'browser.js'));

  const indexPath = path.join(dist, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  if (!html.includes('</title>') || !html.includes('</body>')) {
    throw new Error('dist/index.html has no </title> or </body> to attach the demo to');
  }
  if (html.includes('js/platform/browser.js')) {
    throw new Error('www/index.html already references the browser fallback; the Android copy must not');
  }
  html = html.replace(
    '</title>',
    '</title>\n<link rel="icon" href="favicon.png" type="image/png">'
  );
  html = html.replace(
    '</body>',
    '<script src="js/platform/browser.js"></script>\n</body>'
  );
  fs.writeFileSync(indexPath, html);
  return { dist, files: countFiles(dist) };
}

if (require.main === module) {
  const built = buildWeb();
  console.log('Wrote ' + path.relative(root, built.dist) + '/ (' + built.files + ' files).');
  console.log('Preview: npm run preview:web');
  console.log('This did not deploy. vercel.json was not changed.');
}

module.exports = { buildWeb, pngAsIco };
