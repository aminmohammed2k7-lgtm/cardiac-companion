# Permissions and backups

What the Android app may do on the phone, and why. Phase 2 of the work order
(`docs/claude-code-order.pdf`, task 10) and `DECISIONS.md`.

## The app asks for no permissions

`android/app/src/main/AndroidManifest.xml` declares none, and removes
`INTERNET` with `tools:node="remove"`, so even a library that asks for it
can't add it back. Without `INTERNET`, Android doesn't let the app reach
the network at all. That's a privacy promise anyone can check (safety
charter rule 3).

The app works without it because Capacitor serves the app's own files
(`www/`) from inside the APK. The WebView loads `https://localhost/`, and
Capacitor answers those requests itself; nothing goes over a network. The fonts
are bundled too (`www/fonts/`).

Debugging still works: `chrome://inspect` talks to the WebView over the USB
cable (adb), not over the internet.

**If removing `INTERNET` ever breaks something on a phone,** put the plain
`<uses-permission android:name="android.permission.INTERNET" />` back, and
write here what broke and why the app needs it. Don't do it silently.

### Permissions Android adds by itself

The merged manifest (what is really in the APK) can list a permission that
no one asked for:

- `org.cardiaccompanion.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` comes
  from AndroidX. It is a *signature* permission private to the app, which
  lets the app's own parts talk to each other. The person is never asked
  about it, and it gives no access to anything.

The GitHub Actions build prints the APK's final list in its log (step
"Permissions in the APK"). Phase 8 checks the release build the same way.

### Later phases

- **Phase 4** (reminders) adds `POST_NOTIFICATIONS` (asked for after the
  first medicine is added), `SCHEDULE_EXACT_ALARM` (never `USE_EXACT_ALARM`)
  and `RECEIVE_BOOT_COMPLETED`, through `@capacitor/local-notifications`.
- **Phase 6** (camera pulse) may add `CAMERA` to **debug builds only**. The
  release must never have it (charter rule 7); `tests/android.test.js` fails
  if `CAMERA` appears in the main manifest.
- **Never:** `CALL_PHONE` (call buttons only open the dialer),
  `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, `USE_EXACT_ALARM`.

## Backups are off

Health data never leaves the phone, so Android's own copies are off:

| Setting | What it stops |
|---|---|
| `android:allowBackup="false"` | Google Drive backup on Android 6–11, and transfer to a new phone on Android 6–11 |
| `android:fullBackupContent="false"` | The same, said a second way for Android 6–11 |
| `android:dataExtractionRules` → `res/xml/data_extraction_rules.xml` | Android 12+: cloud backup **and** device-to-device transfer. Since Android 12, `allowBackup="false"` alone no longer stops the transfer to a new phone, so every storage area is excluded from both |

People move their record with the app's own backup file (Settings → Your
data → Back up now), which they choose where to send.

`tests/android.test.js` fails if any of this changes.
