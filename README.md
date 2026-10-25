# Cardiac Companion

A medicine record for people with heart disease in Ethiopia, and for the
parents who keep a child's record. It runs on Android phones with no
internet and no account. Everything stays on the phone.

It is built mainly for rheumatic heart disease, where two treatments matter
most and are hardest to keep on a paper card: warfarin, with regular INR
blood tests, and the benzathine penicillin injection every few weeks.

## What it does

- Shows today's warfarin dose as the doctor wrote it, with the tablets to
  take, and keeps INR results against the doctor's target range.
- Counts down to the next penicillin injection and keeps a record of each
  one. There is a screen to show the nurse.
- Lists today's medicines by time, counts tablets left and warns before
  they run out.
- Keeps daily weight, readings the person measured themselves, symptoms, a
  short mood check and notes.
- Lists the warning signs, and makes calling the clinic, the ambulance or
  family one tap.
- Makes a visit summary for the doctor (a PDF in English, with an optional
  copy in the person's own language) and a shorter update for family.
- Works in English, Amharic and Afaan Oromo, with Ethiopian and Gregorian
  dates and the Ethiopian clock.
- Keeps several people on one phone, and a one-file backup.

## What it does not do

- It never works out, rounds or changes a dose. It shows what was entered.
- It does not diagnose. It compares an INR result with the range the doctor
  set, and shows fixed warning-sign text. Nothing else is interpreted.
- It sends nothing anywhere. There are no servers, accounts, analytics, ads
  or crash reports, and no fonts or code from the internet.

## Run it

In a browser, for a quick look: open `www/index.html`.

As the Android app (needs Node and Android Studio):

```
npm install
npx cap sync android
npx cap open android
```

Or build a debug APK from the command line:

```
cd android
gradlew.bat assembleDebug      (./gradlew on macOS or Linux)
```

Release signing is set up by the project owner and is not in this repo.

## Tests

```
npm test
```

This runs every test file in `tests/`. The medical rules run three times, in
the Addis Ababa, UTC and New York time zones, because dates must follow the
phone's own calendar day. The tests also check that all three languages have
every string, that the design rules hold, and that the Android app loads
nothing from the internet.

## Where things are

| Path | What it is |
|---|---|
| `www/index.html` | The screens, and the code that draws them |
| `www/css/app.css` | The styles. See `docs/DESIGN-DECISIONS.md` |
| `www/js/strings.js` | Every word the app shows, in three languages |
| `www/js/core/` | The medical rules, small files tested in Node |
| `www/js/platform/` | The only code that talks to Android |
| `www/ppg-engine.js` | Camera pulse estimate, browser only |
| `android/` | The Capacitor Android project |
| `tests/` | `npm test` |
| `tools/pulse-lab.html` | A developer page for the camera engine. Not shipped |
| `docs/` | Decisions, found bugs, wording waiting for review |

## Rules for changes

The safety rules are in `CLAUDE.md`. The short version:

- Health wording is frozen in all three languages. Propose changes in
  `docs/NEEDS-CLINICAL-REVIEW.md`.
- Amharic and Afaan Oromo are only changed by a native speaker.
- A suspected bug in the medical logic is written up in
  `docs/android/FOUND-BUGS.md`, not fixed quietly.
- Storage changes need a tested migration that loses nothing.
- Run `npm test` before every commit.

## Known limits

- Reminders only ring while the app is open or was used recently. For
  alarms that ring when it is closed, the app can add the times to the
  phone's calendar. Android's own notifications come in a later phase.
- Saving and sharing files (backup, PDF, CSV) inside the Android app comes
  in a later phase. In a browser they work now.
- The camera pulse is off in the Android app on purpose.
- The Amharic and Oromo strings added in version 3 still need a review by a
  native speaker.
- Open questions for the clinical lead are in `docs/NEEDS-CLINICAL-REVIEW.md`
  and `docs/android/FOUND-BUGS.md`.
