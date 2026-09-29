# Cardiac Companion

A private, offline heart-health companion for your phone, in **English, Amharic (አማርኛ) and Afaan Oromoo**, with the **Ethiopian calendar and Ethiopian local time**.

Everything is stored on the device. Nothing is sent to a server.

> Cardiac Companion is a personal log, not a medical device. It doesn't diagnose or treat anything, and its camera pulse check is an estimate.

## What it does

| Page | What's on it |
|---|---|
| **Today** | Today's doses with a one-tap **Take** button, your latest readings, quick logging, the week at a glance, and today's log. |
| **Vitals** | Log **blood pressure** (with pulse), **pulse**, **weight**, **oxygen**, **temperature**, **blood sugar** and **INR**. Each reading gets a status in words (for example ACC/AHA blood-pressure categories). There's a 30-day chart and history, a **camera pulse check** and a 30-second hand count. A "Learn: heart rhythms" demo shows simulated ECGs. It is clearly labelled and never logs anything. |
| **Medicines** | Medicines with one or more times a day, and schedules for every day, some days, every N days (for example a 28-day penicillin injection) or as needed. Mark each dose taken or missed, with a reason. Browse past weeks, track pills left with refill warnings, and stop, restart or delete a medicine. |
| **Symptoms** | A daily checklist (chest pain, palpitations, swelling, breathlessness, fainting and more) with how strong and when, plus your own symptoms. Chest pain, fainting and severe breathlessness show **urgent guidance with one-tap call buttons**. Also a stress level with a guided breathing exercise, notes, and a 14-day history. |
| **Summary** | 7, 30 or 90 days: doses taken, average BP and pulse, weight change, symptom days and stress. Charts leave gaps where there's no data and never fill them in with made-up values. Plus data-driven insights, a day-by-day table, a **doctor report** (on screen, print or PDF, in any of the three languages) and a CSV spreadsheet. |

It also has:

- **Reminders at dose times** while the app is open or in the background, as phone notifications with **Take** and **In 10 min** buttons.
- **Calendar reminders** (`.ics`) for when the app is closed.
- **Alerts** for severely high BP, low oxygen, a fast weight gain (a heart-failure warning sign), fever (important with valve disease), a high INR and low pill stock.
- **Settings**: your profile and conditions, clinician and emergency numbers, and personal targets for BP, pulse range, weight-gain alerts and INR range. You can also choose light, dark or automatic theme, text size, Ethiopian or Gregorian calendar, a 24-hour, 12-hour or Ethiopian clock, and kg/°C or lb/°F.
- **Your data**: back up to a file and restore, CSV export, sample data to explore, and delete everything.
- An **installable PWA** that works offline after the first visit.

## Running it

It's a static site: `index.html` plus `sw.js`, with no build step. Serve the folder over **https** (or `http://localhost`) — for example with GitHub Pages — and open `index.html`. Opening the file directly (`file://`) also works, but without offline support or phone notifications. The camera pulse check needs https.

## Upgrading from the first version

Saved data from the first version (`cc-state-v1`) is migrated automatically the first time the new version opens:

- Medicines, today's taken/missed doses and their reasons, notes, custom symptoms, the emergency number and clinical info are all kept.
- The old data is left in place untouched.
- The four example medicines that the old version pre-filled are marked **Example**, and can be removed with one tap.
- The simulator's made-up heart rates are no longer shown as health data. They are kept in backups.

## Tests

```sh
cd tests
npm install
npm test          # 44 checks: logic, end-to-end, camera pulse, accessibility, files
node screens.mjs  # screenshots of every screen in tests/screenshots/ (git-ignored)
```

The tests drive the real page in Chromium through `playwright-core` (pinned to 1.56.1; set `CHROMIUM_PATH` to use another Chromium). They cover:

- The Ethiopian calendar and clock, and BP and other reading categories.
- The pulse algorithm on synthetic signals, and end to end with a generated fingertip video fed to Chromium's fake webcam.
- Medicines, schedules, adherence and reminders on a fake clock, and a new day.
- The v1 migration, the doctor report, backup and restore, CSV and calendar files.
- All three languages, with no missing translations.
- axe-core WCAG 2.1 AA in both themes, touch-target sizes and keyboard use.

## Notes for maintainers

- The app is one file. The code is in sections: translations (`T.en`, `T.am`, `T.or`), core logic, rendering, features, then start-up. Helpers are exposed on `window.CC` for the tests.
- Every new text needs a key in all three tables. A test fails if one is missing or its `{placeholders}` differ.
- The Amharic and Afaan Oromo texts for the new features were written for this version, and should be reviewed by a native speaker, especially the medical advice.
- Health guidance follows common patient guidance: ACC/AHA blood-pressure categories, AHA advice on severe high blood pressure and heart-attack symptoms, heart-failure weight monitoring, and ADA glucose targets. Clinicians can set personal targets in Settings.
