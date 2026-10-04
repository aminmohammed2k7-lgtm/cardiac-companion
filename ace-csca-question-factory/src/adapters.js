/* ACE CSCA Question Factory · adapters.js
 * Generators for the website's speed drill (L01-L12) and easy-trick drill (T01-T12) in the shape the site expects
 * (Website Spec §4):  ACE_GEN.L04 = [8 functions],  ACE_GEN.T05 = function;  each  rng => ({ stem, options, answer, explain }).
 * The site's seeded rng drives the choice, so a stored seed replays the same round. */
;(function (root) {
  'use strict';
  var QF = root.QF, course = QF.course;
  var G = QF.adapters = {};

  /** one integer from the site's rng: a function returning a float in [0, 1), an object with next()/random()/int(), or a plain seed */
  function seedFrom(rng) {
    var x;
    if (typeof rng === 'function') x = rng();
    else if (rng && typeof rng.next === 'function') x = rng.next();
    else if (rng && typeof rng.random === 'function') x = rng.random();
    else if (rng && typeof rng.f === 'function') x = rng.f();
    else if (rng && typeof rng.int === 'function') return 'r' + rng.int(0, 2147483646);
    else return rng === undefined || rng === null ? 'r' + Math.floor(Math.random() * 2147483647) : 's' + String(rng);
    if (x && typeof x === 'object' && 'value' in x) x = x.value;
    return 'r' + (x >= 0 && x < 1 ? Math.floor(x * 2147483647) : Math.floor(Math.abs(Number(x)) % 2147483647));
  }
  function shape(item) {
    return { stem: item.stem, options: item.options.slice(), answer: item.answer, explain: item.solution, traps: item.traps.slice(), code: item.code, lesson: item.lesson, template: item.template, seed: item.seed };
  }
  /** a generator for one template (or a pool of templates: the rng picks one) */
  G.generator = function (ids) {
    ids = Array.isArray(ids) ? ids : [ids];
    ids.forEach(function (id) { if (!QF.templates[id]) throw new Error('unknown template ' + id); });
    return function (rng) {
      var s = seedFrom(rng), id = ids.length === 1 ? ids[0] : ids[QF.hash32(s) % ids.length];
      for (var k = 0; k < 20; k++) {
        try { return shape(QF.gen(id, s + (k ? '~' + k : ''))); } catch (e) { if (/failed verification/.test(e.message)) throw e; }
      }
      throw new Error('generator ' + id + ': no item for seed ' + s);
    };
  };
  /** { L01: [8 fns], …, L12: [8 fns], T01: fn, …, T12: fn } */
  G.aceGen = function () {
    var out = {};
    Object.keys(course.speed).forEach(function (L) { out[L] = course.speed[L].types.map(function (id) { return G.generator(id); }); });
    Object.keys(course.tricks).forEach(function (T) { out[T] = G.generator(course.tricks[T]); });
    return out;
  };
  /** register on window.ACE_GEN without overwriting generators the site already has */
  G.install = function (target) {
    target = target || root;
    var gen = G.aceGen(), reg = target.ACE_GEN = target.ACE_GEN || {};
    Object.keys(gen).forEach(function (k) { if (!reg[k]) reg[k] = gen[k]; });
    return reg;
  };
  /** one speed round (8 items, one per item type) or one trick round (10 items) from a seed */
  G.round = function (key, seed) {
    var gen = G.aceGen()[key], R = QF.rng('round:' + key + ':' + seed);
    if (!gen) throw new Error('unknown drill ' + key);
    if (Array.isArray(gen)) return gen.map(function (g) { return g(R.f); });
    var items = [], seen = {}, guard = 0;
    while (items.length < 10 && guard++ < 200) { var it = gen(R.f); if (!seen[it.stem]) { seen[it.stem] = 1; items.push(it); } }
    return items;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
