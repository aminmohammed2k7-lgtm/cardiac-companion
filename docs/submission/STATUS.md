# Cardiac Companion: status on 27 October 2026

Checked on branch `human-polish-merged` (4ae62dd). This is what the repo
shows, not what we hope.

## Done

- The app: warfarin and INR record against the doctor's range, penicillin
  injection countdown, medicines by time with tablet counts, weight,
  symptoms, mood, warning signs, visit summary PDF, family update.
- Three languages (English, Amharic, Afaan Oromo), Ethiopian and Gregorian
  dates, the Ethiopian clock.
- Offline. No servers, accounts, analytics or remote code. The tests check
  that the Android app loads nothing from the internet.
- Encrypted one-file backup and an optional PIN lock.
- Sample record (Hana Bekele, made up, 19) and a five-stop guided tour.
- Camera pulse estimate, on in every build (decision of 15 October). The
  "not a medical device" line shows under the camera button
  (`tests/page/camera-note.test.js`). The README also has a full
  "Not a medical device" box.
- Signal-quality check for the camera pulse: `www/pulse-quality.js`,
  documented in `docs/pulse-quality-model.md`. It runs on fixed rules tuned
  on synthetic signals only. `www/pulse-quality-weights.js` is still `null`,
  so no trained model exists yet.
- Tests: `npm test` gives 75 runs, 2583 checks, all passing (run again on
  27 October on this branch).
- CI: GitHub Actions "Tests and debug APK" passed on both pushes to
  `human-polish-merged` (26 October).
- Pull requests #2, #3 and #5 to #13 are all merged. #4 was closed. There
  are no open pull requests. #8 and #10 are already in `main`.

## Broken, missing or not proven

- **Camera pulse accuracy is not tested.** No comparison with a pulse
  oximeter has been done. `docs/pulse-accuracy-check.md` has the steps.
  Do not claim an accuracy number anywhere.
- **No pulse readings CSV.** The app can record one (hidden recording mode,
  see `docs/pulse-quality-model.md`), but none is in the repo, so the
  model has never been trained.
- **`human-polish-merged` is not merged into `main`.** Amin has to review
  and merge it.
- **The live demo is behind.** Vercel builds from `main`
  (`docs/demo-build.md`), so https://cardiac-companion.vercel.app shows
  `main` as of 21 October (f56b7f4), without the polish pass. It answered
  200 on 27 October. https://ye-lib-agar.vercel.app also answers 200 with
  the title "Cardiac Companion". The README only names the
  cardiac-companion address. A Vercel preview of this branch was not
  checked (no Vercel access from here).
- **Screenshots are old.** `docs/screenshots/` was last changed on
  15 October, before the polish pass. Colours, spacing and the header
  language control now look a little different.
- **README accuracy.** It matches the code on features, the camera note,
  privacy, tests and commands. Two things are out of date once this branch
  is merged: the screenshots, and the live link still showing the older
  version until `main` deploys.
- **Android:** reminders only ring while the app is open or recently used,
  and saving or sharing files inside the Android app is not built yet
  (README "Known limits"). Only tested in a phone-size browser on this
  branch, not on a real phone.
- **Amharic and Afaan Oromo** strings from version 3 onward still need a
  native speaker.
- **Open decisions:** 5 in `docs/MERGE-NOTES.md`, found bug 8 (a damaged
  record is replaced by an empty one) and the other items in
  `docs/android/FOUND-BUGS.md`, and the wording in
  `docs/NEEDS-CLINICAL-REVIEW.md`.
- **Sample record text uses em dashes** (after "SAMPLE RECORD") in `www/js/demo.js`. It is health-adjacent wording in three
  languages, so it was left alone.
