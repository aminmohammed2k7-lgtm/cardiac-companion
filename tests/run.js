/*
 * Every test file in one run — `npm test`, or:  node tests/run.js
 *
 * Runs each tests/*.test.js once, and each tests/core/*.test.js three times,
 * in three time zones. Dates must follow the phone's own calendar day
 * wherever the phone is (safety charter rule 6), so the medical logic has to
 * give the same answers in Addis Ababa (UTC+3), in UTC, and in New York,
 * which changes its clocks for daylight saving twice a year.
 *
 * Prints one line per run, and a test file's full output only when it fails.
 * Exit code 1 if any run fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ZONES = ['Africa/Addis_Ababa', 'UTC', 'America/New_York'];
const list = dir => fs.existsSync(path.join(__dirname, dir))
  ? fs.readdirSync(path.join(__dirname, dir)).filter(f => f.endsWith('.test.js')).sort().map(f => path.join(dir, f))
  : [];

const runs = [
  ...list('.').map(file => ({ file, zone: null })),
  ...list('core').flatMap(file => ZONES.map(zone => ({ file, zone })))
];

let failed = 0, checks = 0;
for (const { file, zone } of runs) {
  const env = Object.assign({}, process.env);
  if (zone) env.TZ = zone;
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { env, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const passed = /all (\d+) checks passed\s*$/.exec(out);
  const label = 'tests/' + path.posix.join(...file.split(path.sep)) + (zone ? `  [${zone}]` : '');
  if (r.status === 0 && passed) {
    checks += +passed[1];
    console.log(`  ok    ${label}  (${passed[1]} checks)`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}\n` + out.replace(/^/gm, '        '));
  }
}

console.log(failed
  ? `\n${failed} of ${runs.length} test runs failed`
  : `\nall ${runs.length} test runs passed (${checks} checks)`);
process.exit(failed ? 1 : 0);
