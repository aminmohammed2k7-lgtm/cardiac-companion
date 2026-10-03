/*
 * Shared by the tests in tests/core (not a test itself).
 *
 * check() prints one line per check and done() prints the total and sets the
 * exit code, the same way the other test files do. core('doses') loads a
 * module from js/core exactly as Node sees it. at(...) sets the clock that
 * the medical logic reads "today" and "now" from, so a test can stand at
 * 23:59, on a Monday, or on a day the app was not opened.
 */
'use strict';
const path = require('path');
const { isDeepStrictEqual, inspect } = require('util');

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
// check that got equals want, and show both when it does not
function same(name, got, want) {
  const ok = isDeepStrictEqual(got, want);
  check(name, ok, ok ? '' : 'got ' + show(got) + ', want ' + show(want));
}
const show = v => inspect(v, { depth: 4, breakLength: Infinity });
function section(title) { console.log('\n' + title); }
function done() {
  console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

const core = name => require(path.join(__dirname, '..', '..', 'js', 'core', name + '.js'));

// at(2026, 10, 3, 23, 59): the phone's local time, months counted from 1
function at(y, mo, d, h = 9, mi = 0) {
  const t = new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
  core('calendar').setClock(() => new Date(t));
}

module.exports = { check, same, section, done, core, at };
