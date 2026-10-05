# Android permissions

What the app asks Android for, and why. The final list is what Android
Studio shows in the **merged** manifest (`android/app/build/intermediates/
merged_manifest/debug/.../AndroidManifest.xml`); the GitHub build prints it
in the step "Show the final permission list".

## Phase 2 (now)

| Permission | Asked for? | Why |
|---|---|---|
| `INTERNET` | **No — removed** | The app never uses the network (safety charter rule 3). Capacitor's template asks for it; `tools:node="remove"` in `AndroidManifest.xml` takes it out of the final manifest, including any a library adds. The app's own files are served to the WebView from inside the app, which needs no network. |
| `CAMERA` | **No** | The camera pulse is off in the public app (DECISIONS.md, safety charter rule 7). |

Nothing else is asked for. `tests/android.test.js` fails if a permission is
added without being removed, or if the camera appears.

**If the phone test shows something breaks without INTERNET** (it should
not: nothing in the app loads from the network), the permission comes back
only in the build that needs it, and the reason is written here.

## Backups

- `android:allowBackup="false"` and `android:fullBackupContent="false"`:
  Android 11 and older never back the app up.
- `android:dataExtractionRules`: Android 12 and later exclude everything
  from Google's cloud backup **and** from device-to-device transfer.

So health data leaves the phone only in a backup file the person makes and
shares themselves (DECISIONS.md: "Android's automatic cloud backup: Off").
The person must use the app's own **Back up now** before changing phones.

## Later phases (planned, not yet added)

- Phase 4: `POST_NOTIFICATIONS` (Android 13+), and exact alarms for dose
  reminders (`SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM`, decided then),
  `RECEIVE_BOOT_COMPLETED` so reminders survive a restart.
- Each is added with its reason in this file.
