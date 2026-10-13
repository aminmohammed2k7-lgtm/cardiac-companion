/*
 * secure.js — encrypted backup files and the optional PIN lock
 *
 * Plain JavaScript on the phone's own Web Crypto (crypto.subtle), with no
 * library and nothing sent anywhere, so the same file runs in the app
 * (window.CC.secure) and in Node's tests (tests/secure.test.js).
 *
 * Backups: a backup file holds a person's whole health record, and people
 * send it to themselves on Telegram or keep it on a memory card, where
 * anyone who finds it could read it. So the file is encrypted with a
 * passphrase the person chooses. The passphrase is stretched into a key
 * with PBKDF2 (SHA-256, 310,000 rounds, a fresh random salt each time), and
 * the record is sealed with AES-GCM (a fresh random IV each time). AES-GCM
 * also detects any change to the file, so a wrong passphrase and a damaged
 * file both fail to open instead of giving back rubbish.
 *
 * PIN: only a salted PBKDF2 hash of the PIN is kept, never the PIN itself.
 * The lock keeps other people out of the app on a shared phone; it does not
 * encrypt the record stored inside the app.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.CC = root.CC || {}).secure = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const KIND = 'cardiac-companion-backup';
  const FORMAT = 'encrypted';
  const VERSION = 1;
  // OWASP's 2023 advice for PBKDF2-SHA256; a mid-range phone takes well
  // under a second, which is fine for something done once a month.
  const BACKUP_ITERATIONS = 310000;
  const PIN_ITERATIONS = 250000;
  const MIN_PASSPHRASE = 6;
  const PIN_TRIES = 5;          // wrong PINs in a row before a wait
  const PIN_WAIT_MS = 30000;    // the wait after them

  function subtle() {
    const c = typeof crypto !== 'undefined' ? crypto : null;
    if (!c || !c.subtle || !c.getRandomValues) throw new Error('no-webcrypto');
    return c;
  }
  const available = () => { try { subtle(); return true; } catch (e) { return false; } };
  const randomBytes = n => subtle().getRandomValues(new Uint8Array(n));

  // base64 in small slices: String.fromCharCode(...bytes) on a large
  // record would overflow the call stack
  function toB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function fromB64(text) {
    const s = atob(text);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  async function deriveBits(secret, salt, iterations) {
    const c = subtle();
    const base = await c.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    return { c, base, params: { name: 'PBKDF2', hash: 'SHA-256', salt, iterations } };
  }
  async function aesKey(passphrase, salt, iterations) {
    const { c, base, params } = await deriveBits(passphrase, salt, iterations);
    return c.subtle.deriveKey(params, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  // ═══════════════════════════════════════════
  // BACKUP FILES
  // ═══════════════════════════════════════════

  // An encrypted backup file's contents (a JSON object) for `data`, which is
  // the plain backup object the app has always made.
  async function encryptBackup(data, passphrase) {
    if (typeof passphrase !== 'string' || passphrase.length < MIN_PASSPHRASE) throw new Error('weak-passphrase');
    const salt = randomBytes(16), iv = randomBytes(12);
    const key = await aesKey(passphrase, salt, BACKUP_ITERATIONS);
    const plain = new TextEncoder().encode(JSON.stringify(data));
    const sealed = new Uint8Array(await subtle().subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
    return {
      kind: KIND, format: FORMAT, version: VERSION,
      kdf: 'PBKDF2-SHA256', iterations: BACKUP_ITERATIONS, cipher: 'AES-256-GCM',
      salt: toB64(salt), iv: toB64(iv), ciphertext: toB64(sealed)
    };
  }

  // 'encrypted', 'plain' (a backup from before encryption) or null (not a
  // Cardiac Companion backup at all).
  function backupType(file) {
    if (!file || typeof file !== 'object' || file.kind !== KIND) return null;
    if (file.format === FORMAT) {
      const ok = file.version === VERSION && ['salt', 'iv', 'ciphertext'].every(k => typeof file[k] === 'string' && file[k]) &&
        Number.isInteger(file.iterations) && file.iterations >= 100000 && file.iterations <= 10000000;
      return ok ? 'encrypted' : null;
    }
    return file.profiles && Array.isArray(file.profiles.list) && file.states ? 'plain' : null;
  }

  // The plain backup object inside an encrypted file. Throws an Error whose
  // message is 'wrong-passphrase' when the passphrase is wrong or the file
  // was changed (AES-GCM cannot tell the two apart), or 'bad-file'.
  async function decryptBackup(file, passphrase) {
    if (backupType(file) !== 'encrypted') throw new Error('bad-file');
    let salt, iv, sealed;
    try { salt = fromB64(file.salt); iv = fromB64(file.iv); sealed = fromB64(file.ciphertext); }
    catch (e) { throw new Error('bad-file'); }
    const key = await aesKey(String(passphrase || ''), salt, file.iterations);
    let plain;
    try { plain = await subtle().subtle.decrypt({ name: 'AES-GCM', iv }, key, sealed); }
    catch (e) { throw new Error('wrong-passphrase'); }
    let data;
    try { data = JSON.parse(new TextDecoder().decode(plain)); } catch (e) { throw new Error('bad-file'); }
    if (backupType(data) !== 'plain') throw new Error('bad-file');
    return data;
  }

  // ═══════════════════════════════════════════
  // PIN LOCK
  // ═══════════════════════════════════════════
  const pinOk = pin => typeof pin === 'string' && /^\d{4,6}$/.test(pin);

  // What is saved for a PIN: a random salt and the PBKDF2 hash, never the PIN.
  async function hashPin(pin, saltB64, iterations) {
    if (!pinOk(pin)) throw new Error('bad-pin');
    const salt = saltB64 ? fromB64(saltB64) : randomBytes(16);
    const n = iterations || PIN_ITERATIONS;
    const { c, base, params } = await deriveBits(pin, salt, n);
    const bits = new Uint8Array(await c.subtle.deriveBits(params, base, 256));
    return { salt: toB64(salt), hash: toB64(bits), iterations: n };
  }

  // Whether `pin` matches the saved `lock` ({salt, hash, iterations}).
  async function checkPin(pin, lock) {
    if (!pinOk(pin) || !lock || !lock.salt || !lock.hash) return false;
    const got = (await hashPin(pin, lock.salt, lock.iterations)).hash;
    // compare every character, so the time taken says nothing about the PIN
    let diff = got.length ^ lock.hash.length;
    for (let i = 0; i < Math.max(got.length, lock.hash.length); i++) diff |= (got.charCodeAt(i) | 0) ^ (lock.hash.charCodeAt(i) | 0);
    return diff === 0;
  }

  // Wrong-PIN counting. `tries` is {fails, waitUntil} (saved, so closing the
  // app does not reset it); `now` is a time in milliseconds.
  function waitLeft(tries, now) {
    const until = tries && tries.waitUntil || 0;
    return until > now ? Math.ceil((until - now) / 1000) : 0;
  }
  function afterWrongPin(tries, now) {
    const fails = ((tries && tries.fails) || 0) + 1;
    return fails >= PIN_TRIES ? { fails: 0, waitUntil: now + PIN_WAIT_MS } : { fails, waitUntil: (tries && tries.waitUntil) || 0 };
  }

  return {
    KIND, VERSION, BACKUP_ITERATIONS, PIN_ITERATIONS, MIN_PASSPHRASE, PIN_TRIES, PIN_WAIT_MS,
    available, toB64, fromB64,
    encryptBackup, decryptBackup, backupType,
    pinOk, hashPin, checkPin, waitLeft, afterWrongPin
  };
}));
