# Cardiac Companion

An offline heart-health companion for patients in Ethiopia. It runs on the phone
with no account, no cloud and no internet connection, and it helps people
living with heart disease keep their own record between clinic visits.

**Try it:** https://cardiac-companion.vercel.app — tap "Try the sample
record" to look around with a made-up patient. The demo runs in the browser
and keeps anything you type in that browser only.

Version 4.0 (Android app in progress). The web demo is built from the same
code, on every push to `main` (see `docs/demo-build.md`).

> **Not a medical device.** Cardiac Companion is a personal record and reminder
> tool. It does not diagnose, treat or give medical advice. It never computes,
> suggests or changes a dose: it only shows what the person entered from their
> doctor's instructions. Always follow your doctor or nurse. If you feel unwell,
> use the warning signs in the app and get help.

## What it does

- **Rheumatic heart disease (RHD) penicillin.** Tracks the benzathine penicillin
  injection every 2 to 4 weeks, as the clinic orders: when the next one is due,
  late injections, and how many were given in the last year. A "show to the
  nurse" screen has the doctor's order.
- **Warfarin and INR.** Records the warfarin schedule the doctor wrote, each
  dose taken, and INR results compared with the doctor's target range.
- **Medicines.** Dose reminders, tablets left, and a warning before they run out.
- **Weight, symptoms and warning signs.** Fixed warning-sign texts and simple,
  documented rules for weight gain, symptoms and mood.
- **Visit summary.** Everything since the last visit on one page, to show the
  doctor or save as a PDF.
- **Camera pulse estimate (wellness only).** An optional estimate of pulse rate
  from the phone camera and a fingertip, on the web demo and on Android. It
  is not validated for medical use and is not a diagnosis; the "not a
  medical device" line is shown right under the button (see
  `docs/android/DECISIONS.md` and `docs/NEEDS-CLINICAL-REVIEW.md`).
- **Three languages:** English, Amharic (አማርኛ) and Afaan Oromo.
- **Ethiopian and Gregorian calendars and clocks**, side by side or on their own.
- **Several people on one phone**, so a parent can keep a child's record too.
- **Encrypted backups** and an optional **PIN lock** (see Privacy below).

## Screenshots

From the web demo with the sample record (made-up data, not a real patient).

| Today | Medicines | Summary |
|---|---|---|
| <img src="docs/screenshots/today.png" width="240" alt="Today: the sample record banner, today's warfarin dose as the doctor wrote it, and INR results against the target range"> | <img src="docs/screenshots/medicines.png" width="240" alt="Medicines tab with the sample record"> | <img src="docs/screenshots/summary.png" width="240" alt="Summary: adherence, weight change and symptom days, with a weight chart"> |

| Amharic | Camera pulse, with its disclaimer |
|---|---|
| <img src="docs/screenshots/today-amharic.png" width="240" alt="Today screen in Amharic with the Ethiopian date"> | <img src="docs/screenshots/camera-pulse.png" width="240" alt="Pulse entry: the Measure with camera button with the not-a-medical-device line right under it"> |

## Privacy

- **No account, no cloud, no servers.** Everything is stored on the phone only.
  The Android app has no internet permission, no analytics, no ads, no crash
  reporting and no remote code or fonts. Its only permission is the camera,
  asked for when you tap "Measure with camera"; camera frames are never
  saved or sent. Android's automatic cloud backup is
  switched off.
- **Data leaves the phone only when you choose to share a file**, such as a
  backup, a PDF summary, a CSV export or a calendar file.
- **Backups are encrypted.** "Back up now" asks for a passphrase and encrypts
  the file on the phone (Web Crypto: PBKDF2 with SHA-256 and 310,000 rounds,
  a random salt, then AES-256-GCM with a random IV). Without the passphrase,
  nobody can open the file, and nobody can recover a forgotten passphrase.
  Older unencrypted backups can still be restored, with a warning.
- **Optional PIN lock**, off by default (Settings > PIN lock). The PIN is 4 to
  6 digits and only a salted PBKDF2 hash of it is stored. The app asks for it
  when it opens and each time it comes back to the screen. After 5 wrong tries
  it waits 30 seconds. There is no account, so a forgotten PIN cannot be reset:
  the only way back in is to clear all data, then restore a backup. The PIN
  keeps other people out of the app on a shared phone. It does not encrypt the
  data stored inside the app.

## How to run

You need [Node.js](https://nodejs.org/) 22 or later.

```sh
npm install
npm test            # all the tests, in three time zones
```

### In a web browser (for development)

The app is plain HTML and JavaScript in `www/`, with no build step. Serve the
folder and open it in a browser:

```sh
python3 -m http.server 8080 --directory www
# then open http://localhost:8080
```

Use `localhost` (or another secure address), because encrypted backups and the
PIN lock need the browser's Web Crypto. The browser is for development and
testing; the app is published for Android.

### On Android

You also need JDK 21 and the Android SDK (Android Studio is the easiest way to
get both). The app targets Android 16 (API 36) and runs on Android 7.0 (API 24)
and later.

```sh
npx cap sync android                      # copy www/ into the Android project
npx cap open android                      # open it in Android Studio, or:
cd android && ./gradlew assembleDebug     # build a debug APK (gradlew.bat on Windows)
```

The debug APK is in `android/app/build/outputs/apk/debug/`. GitHub Actions also
builds one on every push (`.github/workflows/android.yml`).

## Project layout

- `www/index.html`: the app's screens, words in three languages and saving
- `www/js/core/`: the medical logic (dates, calendars, doses, warfarin,
  injection, health rules, reminders), tested on its own in Node
- `www/js/secure.js`: encrypted backups and the PIN hash
- `www/js/platform/`: the only code that talks to Android (Capacitor)
- `android/`: the Capacitor Android project
- `tests/`: the Node tests (`npm test`)
- `docs/`: the work order, the app guide, the Android decisions, the
  wording waiting for clinical review and the README screenshots
- `.claude/CLAUDE.md`: the safety charter and working rules for AI coding
  tools

## License

Licensed under the [Apache License 2.0](LICENSE). Copyright 2026 Amin Mohammed.
The bundled fonts (Onest and Noto Sans Ethiopic) are under the SIL Open Font
License; their licences are in `www/fonts/`.

AI coding tools were used to help build this project.
