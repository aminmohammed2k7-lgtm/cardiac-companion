/*
 * Encrypted backups and the PIN hash — run with:  node tests/secure.test.js
 *
 * www/js/secure.js on its own, on Node's Web Crypto (the same API as the
 * phone's WebView). A backup file must open again with the right passphrase
 * and give back exactly what went in, must not open with a wrong one or
 * after any change to the file, and must not show the record in readable
 * form. A PIN must never be stored, only a salted hash, and five wrong PINs
 * must mean a 30-second wait. Exit code 1 if any check fails.
 */
'use strict';
const path = require('path');
const { isDeepStrictEqual } = require('util');
const sec = require(path.join(__dirname, '..', 'www', 'js', 'secure.js'));

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
async function fails(fn) { try { await fn(); return null; } catch (e) { return e.message; } }

// a small but real-looking backup, with Amharic text to test UTF-8
const backup = {
  kind: 'cardiac-companion-backup', v: 3, exported: '2026-10-03T06:00:00.000Z',
  profiles: { list: [{ id: 'p1', name: 'Almaz ተስፋዬ' }], active: 'p1' },
  states: { p1: { warfarin: { enabled: true }, notes: 'ራስ ምታት', inr: [{ date: '2026-10-01', value: 2.4 }] } }
};

(async () => {
  console.log('1. Backup files');
  check('Web Crypto is there', sec.available());
  check('at least 250,000 PBKDF2 rounds', sec.BACKUP_ITERATIONS >= 250000 && sec.PIN_ITERATIONS >= 250000);

  const file = await sec.encryptBackup(backup, 'correct horse');
  const text = JSON.stringify(file);
  check('the file says what it is: kind, version, salt, iv, ciphertext',
    file.kind === 'cardiac-companion-backup' && file.version === 1 && file.format === 'encrypted' &&
    ['salt', 'iv', 'ciphertext'].every(k => typeof file[k] === 'string' && /^[A-Za-z0-9+/]+=*$/.test(file[k])));
  check('a 16-byte salt and a 12-byte IV', sec.fromB64(file.salt).length === 16 && sec.fromB64(file.iv).length === 12);
  check('nothing from the record can be read in the file',
    !/Almaz|ተስፋዬ|ራስ|warfarin|2026-10-01|profiles|states/.test(text));
  check('it is recognised as an encrypted backup', sec.backupType(file) === 'encrypted');

  const again = await sec.encryptBackup(backup, 'correct horse');
  check('a new salt and IV every time', again.salt !== file.salt && again.iv !== file.iv && again.ciphertext !== file.ciphertext);

  check('the right passphrase gives back exactly what went in',
    isDeepStrictEqual(await sec.decryptBackup(file, 'correct horse'), backup));
  check('a wrong passphrase is refused', await fails(() => sec.decryptBackup(file, 'correct horsE')) === 'wrong-passphrase');
  check('an empty passphrase is refused', await fails(() => sec.decryptBackup(file, '')) === 'wrong-passphrase');

  const bytes = sec.fromB64(file.ciphertext); bytes[5] ^= 1;
  check('a changed file does not open', await fails(() => sec.decryptBackup(Object.assign({}, file, { ciphertext: sec.toB64(bytes) }), 'correct horse')) === 'wrong-passphrase');
  check('a changed salt does not open', await fails(() => sec.decryptBackup(Object.assign({}, file, { salt: again.salt }), 'correct horse')) === 'wrong-passphrase');
  check('a damaged file is reported as not a backup', await fails(() => sec.decryptBackup(Object.assign({}, file, { iv: '%%%' }), 'x')) === 'bad-file');
  check('a passphrase under 6 characters is not accepted', await fails(() => sec.encryptBackup(backup, '12345')) === 'weak-passphrase');

  // a large record: base64 is done in slices so it cannot overflow the stack
  const big = Object.assign({}, backup, { states: { p1: { notes: 'x'.repeat(600000) } } });
  check('a large record (600 kB) goes through', isDeepStrictEqual(await sec.decryptBackup(await sec.encryptBackup(big, 'long enough'), 'long enough'), big));

  console.log('\n2. Telling backups apart');
  check('an old unencrypted backup is "plain"', sec.backupType(backup) === 'plain');
  check('another JSON file is not a backup', sec.backupType({ hello: 1 }) === null && sec.backupType(null) === null && sec.backupType('x') === null);
  check('an encrypted file with a missing part is not a backup', sec.backupType(Object.assign({}, file, { iv: '' })) === null);
  check('an encrypted file from a future version is not opened', sec.backupType(Object.assign({}, file, { version: 2 })) === null);
  check('absurd round counts are not trusted', sec.backupType(Object.assign({}, file, { iterations: 1 })) === null &&
    sec.backupType(Object.assign({}, file, { iterations: 1e12 })) === null);

  console.log('\n3. PIN');
  check('4 to 6 digits', ['1234', '12345', '123456'].every(sec.pinOk));
  check('not 3 or 7 digits, letters, spaces or numbers', !['123', '1234567', '12a4', ' 1234', '', 1234, null].some(sec.pinOk));
  const lock = await sec.hashPin('2468');
  check('only a salt and a 32-byte hash are kept', isDeepStrictEqual(Object.keys(lock).sort(), ['hash', 'iterations', 'salt']) &&
    sec.fromB64(lock.hash).length === 32 && sec.fromB64(lock.salt).length === 16);
  check('the PIN itself is not in what is kept', !JSON.stringify(lock).includes('2468'));
  const lock2 = await sec.hashPin('2468');
  check('the same PIN gets a different salt and hash', lock2.salt !== lock.salt && lock2.hash !== lock.hash);
  check('the right PIN opens', await sec.checkPin('2468', lock));
  check('a wrong PIN does not', !(await sec.checkPin('2469', lock)) && !(await sec.checkPin('24680', lock)));
  check('nothing opens without a saved PIN', !(await sec.checkPin('2468', null)));

  console.log('\n4. Wrong PINs');
  let t = { fails: 0, waitUntil: 0 };
  const now = 1000000;
  for (let i = 1; i <= 4; i++) t = sec.afterWrongPin(t, now);
  check('four wrong PINs: no wait yet', t.fails === 4 && sec.waitLeft(t, now) === 0);
  t = sec.afterWrongPin(t, now);
  check('the fifth: a 30-second wait', sec.waitLeft(t, now) === 30 && t.fails === 0);
  check('still waiting after 29 seconds', sec.waitLeft(t, now + 29000) === 1);
  check('free again after 30 seconds', sec.waitLeft(t, now + 30000) === 0);
  check('no record of tries: no wait', sec.waitLeft(undefined, now) === 0 && sec.afterWrongPin(undefined, now).fails === 1);

  console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
