# Browser-only APIs in v3.2 and their Android replacements

Phase 0 of the 4.0 work order (`docs/claude-code-order.pdf`). Every place the
v3.2 web app uses something that only a browser provides, what it does for the
user today, what replaces it in the Android app, and the phase that does it.

**Line numbers** are for `index.html` on `main` at commit 71f4eaa (5,972 lines),
before the camera-pulse branch is merged. That merge
(aminmohammed2k7-lgtm/cardiac-companion#3) adds 52 lines, so lines after
about 211 move down by 1 to 52. The function names stay the same, so use
those to find a spot after the merge.

**Since Phase 1** the medical logic lives in `js/core/*.js` (the dates,
calendars, dose plans, supply, warfarin, injection, health rules and reminder
timing), and `index.html` is about 300 lines shorter. The line numbers below
are still v3.2's. Search for the function name; where a function moved, its
row names the file.

Phases: **2** Android shell, **3** storage, **4** reminders, **5** files,
sharing and calls, **6** camera pulse, **7** polish and accessibility,
**9** retiring the website.

## 1. Storage

| Where | What it does today | Android replacement | Phase |
|---|---|---|---|
| `index.html:3245` `readState()`, `:3249` `writeState()` | One record per person in localStorage under `cc-state-v3:<id>` (`STATE_PREFIX`, `:2908`) | `www/js/platform/storage.js`: in-memory cache read synchronously, persisted to one JSON file per person through `@capacitor/filesystem`, with atomic `.tmp` → rename and a `.bak` copy | 3 |
| `:3259` `saveProfiles()`, `:3267` load | List of people, key `cc-profiles` (`:2910`) | Same layer, `profiles` file | 3 |
| `:3261` load, `:3263` `saveGlobal()` | Shared settings (last backup, snoozes, asked-persist flag), key `cc-global` (`:2911`) | Same layer, `global` file | 3 |
| `:3275` | Reads the old v2 record `cc-state-v2` (`LEGACY_KEY`, `:2909`) and runs `migrateV2()` | Keep. The Phase 3 migration copies **all** `cc-*` keys, including any leftover `cc-state-v2` | 3 |
| `:1777` (head script), `:4955`, `:5941` | Theme `cc-theme`. It is read **synchronously before the first paint** so dark mode doesn't flash | Preferences file. See risk R1 | 3 |
| `:5129`, `:5946` | Language `cc-lang`, read at start-up | Preferences file. See risk R1 | 3 |
| `:4991` | Deletes a person's record when they are removed | `storage.remove()` (keeps a `.bak`, as the charter requires) | 3 |
| `:5788–5790` `restoreFromFile()` | Restore overwrites every person's record, then the profile list | Restore goes through the storage layer: validate, ask, write, reload | 3, 5 |
| `ppg-engine.js:1178–1179` `store` | Remembers which camera had the light (`ppg-camera-id`) | Camera only. It stays in WebView localStorage, and release builds don't include it | 6 |
| `:5962` `storage` event | Follows changes made in another browser tab | **Removed.** An app has one WebView, so there's no other tab | 2 |
| `:3287` `maybePersist()`, `:3290` | Asks the browser not to evict the data (`navigator.storage.persist`) | **Removed.** The app's private files aren't evicted | 2 |
| `:4918–4921` `renderStorageStatus()`, Settings line `#persistStatus` (`:1662`) | Shows "storage is protected / may be cleared" in Settings | **Removed** (the Settings line too). Backup status (`#backupStatus`) stays | 2 |

## 2. Reminders and notifications

| Where | What it does today | Android replacement | Phase |
|---|---|---|---|
| `:5956` `setInterval(tick, 30000)`, `:5906` `tick()` | Checks reminders every 30 s, **only while the page is open** | Native scheduled notifications through `@capacitor/local-notifications`. Their stable IDs are rescheduled on the events Phase 4 lists | 4 |
| `:5958` `pageshow` | Re-checks reminders when the page is shown again (also after the back button) | Same as `visibilitychange`: `appStateChange` | 3, 4 |
| `:5957` `visibilitychange` | Re-checks reminders when the page comes back | `@capacitor/app` `appStateChange`: flush storage on background (Phase 3), reschedule on foreground (Phase 4) | 3, 4 |
| `:5842` `checkRemindersFor()`, `:5889` `checkReminders()` | Decides what is due, missed or coming up, for each person | The rules move to `js/core/` in Phase 1 and are tested. Phase 4 turns them into a schedule | 1, 4 |
| `:5806` `systemNotify()`: `Notification`, `:5811–5812` service-worker `showNotification`, `:5813` `new Notification` | Shows the phone notification | `LocalNotifications.schedule()` on two channels: "Medicine reminders" (high) and "Coming up" (default), with private lock-screen visibility | 4 |
| `:5822` `requestNotificationPermission()`, `:5074` `#notifPermBlock`, `:4905` | Asks for permission and shows the Enable block | `LocalNotifications.requestPermissions()`, asked right after the first medicine is added. If refused, a calm banner on Today | 4 |
| `:5830` `testNotification()` | Test notification | "Send a test reminder in 1 minute" | 4 |
| `sw.js:62` `notificationclick` | Tapping a notification focuses or opens the page | `localNotificationActionPerformed` opens Today for the right person | 4 |
| `:5058` `addNotification()`, the in-app Notifications panel | In-app list | **Not a browser API.** Stays as it is | — |
| `:5700` `buildIcs()`, `:5749` `exportIcs()` | "Add reminders to my calendar" (.ics) | Stays as an optional extra. The file goes out through Phase 5's share path | 4, 5 |
| `window.CC_ICON` (notification icon) | Colour icon from a data: URL | Monochrome (white on transparent) small icon resource | 2 |

## 3. Files, sharing, clipboard, calls

| Where | What it does today | Android replacement | Phase |
|---|---|---|---|
| `:5598` `downloadBlob()`: `URL.createObjectURL` + `<a download>` | Saves the summary PDF (`:5627`), medical ID PDF (`:5641`) and CSV (`:5670`) | Write to the cache folder with `@capacitor/filesystem`, then open the share sheet with `@capacitor/share`. File names stay the same. See risk R2 | 5 |
| `:5608` `shareOrDownload()`: `navigator.canShare`/`share({files})` (`:5611–5612`), fallback `downloadBlob` | Backup JSON (`:5767`) and .ics (`:5752`) | Same as above | 5 |
| `:5469` `shareFamily()`: `navigator.share({text})` (`:5473`), fallback `navigator.clipboard.writeText` (`:5474`) | "Send to family" | `@capacitor/clipboard` (and the share sheet for text) | 5 |
| `:1724` `<input type="file" id="restoreInput">`, `:1666` button, `:5773` `restoreFromFile()` | Restore from a backup | First test the file input in the WebView on the Samsung. If it's unreliable, propose a file-picker plugin (needs Amin's OK) | 5 |
| `:4073–4075` `tel:` links (ambulance, clinic, family) | Opens the dialer | Same `tel:` links, with the dialer opened by an Android intent. **No CALL_PHONE permission** | 5 |
| `:5555` `canvasesToPdf()`, `:5513` `newPdfCanvas()` | PDFs drawn on a canvas with the page's fonts | No API change. The fonts must be bundled (Phase 2). See risk R3 | 2, 5 |

## 4. Install, offline and web-app shell

| Where | What it does today | Android replacement | Phase |
|---|---|---|---|
| `:5965` `navigator.serviceWorker.register('sw.js')` | Offline cache of the page | **Removed.** The files are inside the APK | 2 |
| `sw.js` (72 lines, cache `cardiac-companion-v6`, `FONT_HOSTS` `:13`) | Caches the page and Google Fonts | Not shipped in the app. On the website, replaced by a self-unregistering worker | 2, 9 |
| `:5959` `beforeinstallprompt`, `:5923` `triggerInstall()`, Settings row "Add to home screen" (`:1668`) | Install prompt | **Removed** with its Settings row and toasts. The strings are kept for now. Any wording removal goes through Amin | 2 |
| `:8` `<link id="manifestLink" rel="manifest">`, `:1739–1764` manifest built as a blob: URL | Web-app manifest and icons | **Removed.** `ICON_512` / `ICON_MASK` (data: URLs near `:1736`) become the adaptive launcher icon and splash | 2 |
| `:49–51` Google Fonts `<link>` (Onest, Noto Sans Ethiopic) | Remote fonts | Bundled in `www/fonts/` with their OFL licences, loaded with `@font-face`, same fallback stack | 2 |

## 5. Display and device

| Where | What it does today | Android replacement | Phase |
|---|---|---|---|
| `:5941` `matchMedia('(prefers-color-scheme: dark)')` | First-run theme follows the phone | Keep. Check that the WebView reports the system theme, and style the system bars for both themes | 2, 7 |
| `:155` `@media (prefers-reduced-motion: reduce)` | Turns off animations | Keep. Check on the phone | 7 |
| Text size setting (Normal / Large) | App's own Large text | Keep. Also: fix WebView text zoom at 100%, and on first launch only, switch on Large when the system font scale is 1.15 or more | 2 |
| `:3080` `islamicParts()` (now `js/core/seasons.js`): `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')` | Ramadan dates (the app asks the user to confirm) | Keep. Phase 1 tests check it in Node. Check on the Samsung's WebView too. See risk R4 | 1, 7 |
| `ppg-engine.js:1198` `getUserMedia`, `:1182–1238` torch (`getCapabilities`, `applyConstraints`), `:1487` exposure | Camera pulse | Behind the `cameraPulse` build flag: **off in release**, and no CAMERA permission in the release manifest | 6 |
| `ppg-engine.js:1360–1361` `navigator.wakeLock`, `:1359` `visibilitychange` | Keeps the screen on while measuring | Camera only, same flag | 6 |

## 6. Checked and not a problem

- **UTC dates (charter rule 6).** Calendar days use `localDateKey()` (`:2943`;
  see the comment at `:2941`). The only UTC uses are `icsStampUtc()` (`:5697`;
  the .ics format requires a UTC timestamp) and the backup's `exported` time
  (`:5765`; a moment, not a calendar day). Neither is a calendar day.
- **No network calls.** There's no `fetch`, `XMLHttpRequest`, analytics or remote
  script in `index.html` or `ppg-engine.js`. The only remote load is
  Google Fonts (`:49–51`). `sw.js` uses `fetch` only to serve and cache the page and fonts.
- **Nothing else.** No IndexedDB, BroadcastChannel, geolocation, vibration, audio or
  speech APIs.

## Risks

- **R1. Start-up reads that must be synchronous.** The theme is read from
  localStorage in a head script (`:1777`) before the page paints. The language
  (`:5946`) and every person's record (`readState()`) are also read
  synchronously. `@capacitor/filesystem` is asynchronous. Phase 3 has to load
  the files into memory **before** the first render, and keep theme and language
  readable early, or dark-mode users will see a white flash and the wrong language.
- **R2. Exports do nothing inside the WebView until Phase 5.** `<a download>` with
  a blob: URL has no effect in a Capacitor WebView. On the Phase 2 debug build,
  the summary PDF, medical ID PDF and CSV will do nothing, and backup and .ics
  will work only if the WebView supports `navigator.share` with files. That's
  expected ("features that later phases replace"), but Amin should know when he
  tests Phase 2.
- **R3. Amharic text in PDFs depends on the fonts.** The PDFs are drawn on a canvas
  with whatever font has loaded. With Google Fonts unreachable (first launch in
  airplane mode), Amharic falls back to a system font, or to boxes on
  phones without Ethiopic fonts. Bundling the fonts in Phase 2 fixes this.
  Phase 5's "PDFs show Amharic correctly" check confirms it.
- **R4. Ramadan dates depend on the WebView's Intl data.** Chrome-based WebViews
  include the Umm al-Qura calendar, but an old or stripped-down WebView might
  not. Check on the Samsung, and on one TECNO, itel or Infinix phone.
- **R5. Reminders don't work in the Android app until Phase 4.** Today's engine
  only runs while the page is open (as the header comment at `:34–38` says). Phases
  2 and 3 builds must not be given to patients.
- **R6. The camera-branch merge is pending.** Until Amin merges
  aminmohammed2k7-lgtm/cardiac-companion#3, the reading tiles on Today throw an
  error on the live site. After the merge, the line numbers above shift (see the top of this file).
- **R7. The camera writes to localStorage itself.** `ppg-engine.js` keeps
  `ppg-camera-id` outside the storage layer. This is harmless while the camera
  is off in release builds. If Phase 6b ever ships the camera, move it behind the platform layer.
