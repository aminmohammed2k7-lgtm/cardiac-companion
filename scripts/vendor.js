/*
 * Copies Capacitor's ready-made browser files into www/js/vendor/ — run with:
 *   npm run vendor
 *
 * The app has no bundler: index.html loads plain script files. Capacitor's
 * core (window.Capacitor, the SystemBars plugin) and the App plugin (back
 * button) each ship one such file in node_modules. Run this after updating
 * the @capacitor packages; tests/android.test.js fails if the copies and
 * node_modules ever disagree.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const FILES = [
  ['node_modules/@capacitor/core/dist/capacitor.js', 'www/js/vendor/capacitor-core.js'],
  ['node_modules/@capacitor/app/dist/plugin.js', 'www/js/vendor/capacitor-app.js'],
];

function copy() {
  fs.mkdirSync(path.join(root, 'www/js/vendor'), { recursive: true });
  for (const [from, to] of FILES) {
    // drop the source-map line: the map file is not shipped
    const code = fs.readFileSync(path.join(root, from), 'utf8').replace(/\n\/\/# sourceMappingURL=.*\s*$/, '\n');
    fs.writeFileSync(path.join(root, to), code);
    console.log('  ' + from + ' → ' + to);
  }
}
if (require.main === module) copy();
module.exports = { FILES };
