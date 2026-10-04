/* ACE CSCA Question Factory · Node entry. Loads the plain-script modules in order; they attach to globalThis.QF. */
'use strict';
var FILES = [
  'core/rng.js', 'core/num.js', 'core/tex.js', 'core/latexeval.js', 'taxonomy.js', 'core/item.js',
  'templates/_helpers.js', 'templates/si.js', 'templates/fn1.js', 'templates/fn2.js', 'templates/tr1.js', 'templates/tr2.js', 'templates/sq1.js', 'templates/sq2.js', 'templates/ln1.js', 'templates/ln2.js', 'templates/cn1.js', 'templates/cn2.js', 'templates/vcp.js', 'templates/extra.js',
  'data/atlas.js', 'data/course.js', 'assemble.js', 'bank.js', 'validate.js', 'adapters.js'
];
var fs = require('fs'), path = require('path');
FILES.forEach(function (f) {
  var p = path.join(__dirname, f);
  if (fs.existsSync(p)) require(p);
});
module.exports = globalThis.QF;
module.exports.FILES = FILES;
